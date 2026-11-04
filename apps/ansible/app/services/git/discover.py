"""Descubrimiento de playbooks en un commit de un mirror.

Un fichero es playbook si es ``.yml``/``.yaml`` bajo ``subdir``, no vive en un
directorio de soporte de Ansible (``roles/``, ``group_vars/``…) ni oculto, y su
valor YAML de primer nivel es una lista de plays (mappings con ``hosts`` o
``import_playbook``).

Un rol es un directorio directamente bajo ``roles/`` con ``tasks/main`` o
``meta/main``. Se listan los que están bajo ``subdir`` o en los ``roles/`` de sus
ancestros, donde un run puede encontrarlos.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any

import yaml

from app.services.git.mirror import GitError, list_tree, read_blob, safe_repo_path

_EXCLUDED_DIRS = {"roles", "group_vars", "host_vars", "collections"}
_PLAY_KEYS = {"hosts", "import_playbook", "ansible.builtin.import_playbook"}
# Playbook content is also shown in the UI; bigger files are not playbooks
# anyone reads in a browser.
MAX_PLAYBOOK_BYTES = 256 * 1024
MAX_PLAYBOOKS = 500
MAX_ROLES = 500
MAX_ROLE_DESCRIPTION_CHARS = 500
_YAML_MAIN = {"main.yml", "main.yaml"}
_REQUIREMENTS = ("requirements.yml", "requirements.yaml")


@dataclass
class DiscoveredPlaybook:
    path: str
    content: str


@dataclass
class DiscoveredRole:
    name: str
    path: str
    description: str | None = None


@dataclass
class DiscoveredRoles:
    roles: list[DiscoveredRole] = field(default_factory=list)
    requirements_files: list[str] = field(default_factory=list)


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


def _subdir_parts(subdir: str) -> tuple[str, ...]:
    stripped = subdir.strip("/")
    return safe_repo_path(stripped).parts if stripped else ()


def _is_ancestor_or_inside(parent: tuple[str, ...], subdir: tuple[str, ...]) -> bool:
    shared = min(len(parent), len(subdir))
    return parent[:shared] == subdir[:shared]


def _role_marker(path: str, subdir: tuple[str, ...]) -> tuple[str, str, str] | None:
    """``(ruta del rol, nombre, carpeta del marcador)`` si ``path`` marca un rol."""
    parts = PurePosixPath(path).parts
    if "roles" not in parts:
        return None
    index = parts.index("roles")
    parent = parts[:index]
    rest = parts[index + 1 :]
    if (
        any(p.startswith(".") or p == "collections" for p in parent)
        or not _is_ancestor_or_inside(parent, subdir)
        or len(rest) != 3
        or rest[0].startswith(".")
        or rest[1] not in {"tasks", "meta"}
        or rest[2] not in _YAML_MAIN
    ):
        return None
    return PurePosixPath(*parts[: index + 2]).as_posix(), rest[0], rest[1]


def _role_description(repository_id: str, blob: str, size: int) -> str | None:
    """``galaxy_info.description``; cualquier problema significa sin descripción."""
    if size > MAX_PLAYBOOK_BYTES:
        return None
    try:
        content = read_blob(repository_id, blob).decode("utf-8")
        data = yaml.load(content, Loader=_AnsibleLoader)  # noqa: S506 - SafeLoader subclass
    except (GitError, ValueError, yaml.YAMLError):
        return None
    info = data.get("galaxy_info") if isinstance(data, dict) else None
    description = info.get("description") if isinstance(info, dict) else None
    if not isinstance(description, str):
        return None
    return description.strip()[:MAX_ROLE_DESCRIPTION_CHARS] or None


def _requirements_locations(subdir: tuple[str, ...]) -> set[str]:
    bases = {PurePosixPath(), PurePosixPath(*subdir)}
    return {
        (base / folder / name).as_posix()
        for base in bases
        for folder in ("", "roles", "collections")
        for name in _REQUIREMENTS
    }


def discover_roles(repository_id: str, commit: str, subdir: str) -> DiscoveredRoles:
    """Lista los roles de ``commit`` y sus ``requirements`` (bloqueante; en un thread)."""
    scope = _subdir_parts(subdir)
    requirements = _requirements_locations(scope)
    names: dict[str, str] = {}
    meta_blobs: dict[str, tuple[str, int]] = {}
    requirements_files: list[str] = []
    # Todo el árbol: un ``roles/`` por encima de ``subdir`` también cuenta.
    for path, blob, size in list_tree(repository_id, commit, ""):
        if path in requirements:
            requirements_files.append(path)
        marker = _role_marker(path, scope)
        if marker is None:
            continue
        role_path, name, folder = marker
        names[role_path] = name
        # ``main.yml`` y ``main.yaml`` llegan ordenados: gana el primero.
        if folder == "meta":
            meta_blobs.setdefault(role_path, (blob, size))

    roles = [
        DiscoveredRole(
            name=names[role_path],
            path=role_path,
            description=(
                _role_description(repository_id, *meta_blobs[role_path])
                if role_path in meta_blobs
                else None
            ),
        )
        for role_path in sorted(names)[:MAX_ROLES]
    ]
    return DiscoveredRoles(roles=roles, requirements_files=sorted(requirements_files))
