"""Descubrimiento de playbooks en un commit de un mirror.

Un fichero es playbook si es ``.yml``/``.yaml`` bajo ``subdir``, no vive en un
directorio de soporte de Ansible (``roles/``, ``group_vars/``…) ni oculto, y su
valor YAML de primer nivel es una lista de plays (mappings con ``hosts`` o
``import_playbook``).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import yaml

from app.services.git.mirror import list_tree, read_blob

_EXCLUDED_DIRS = {"roles", "group_vars", "host_vars", "collections"}
_PLAY_KEYS = {"hosts", "import_playbook", "ansible.builtin.import_playbook"}
# Playbook content is also shown in the UI; bigger files are not playbooks
# anyone reads in a browser.
MAX_PLAYBOOK_BYTES = 256 * 1024
MAX_PLAYBOOKS = 500


@dataclass
class DiscoveredPlaybook:
    path: str
    content: str


class _AnsibleLoader(yaml.SafeLoader):
    """SafeLoader que acepta tags de Ansible (``!vault``, ``!unsafe``…)."""


def _ignore_tag(loader: yaml.SafeLoader, _suffix: str, node: yaml.Node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    if isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node)
    return None


_AnsibleLoader.add_multi_constructor("!", _ignore_tag)


def _is_candidate(path: str) -> bool:
    parts = path.split("/")
    if not parts[-1].endswith((".yml", ".yaml")):
        return False
    return not any(p.startswith(".") or p in _EXCLUDED_DIRS for p in parts[:-1])


def is_playbook(content: str) -> bool:
    try:
        data = yaml.load(content, Loader=_AnsibleLoader)  # noqa: S506 - SafeLoader subclass
    except yaml.YAMLError:
        return False
    if not isinstance(data, list) or not data:
        return False
    return all(isinstance(play, dict) and _PLAY_KEYS & play.keys() for play in data)


def discover(repository_id: str, commit: str, subdir: str) -> list[DiscoveredPlaybook]:
    """Lista los playbooks de ``commit`` (bloqueante; en un thread)."""
    found: list[DiscoveredPlaybook] = []
    for path, blob, size in list_tree(repository_id, commit, subdir):
        if size > MAX_PLAYBOOK_BYTES or not _is_candidate(path):
            continue
        try:
            content = read_blob(repository_id, blob).decode("utf-8")
        except UnicodeDecodeError:
            continue
        if is_playbook(content):
            found.append(DiscoveredPlaybook(path=path, content=content))
            if len(found) >= MAX_PLAYBOOKS:
                break
    return found
