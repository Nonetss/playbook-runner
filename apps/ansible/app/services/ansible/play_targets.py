"""Hace que cada play apunte a la selección del run, diga lo que diga ``hosts``.

Los hosts de un run se eligen al lanzarlo y son todo su inventario, así que el
patrón escrito en el playbook no decide nada. Se reescribe solo la copia del run
y solo el valor de ``hosts``: comentarios, ``!vault`` y el resto del texto quedan
intactos. ``import_playbook`` se sigue dentro del proyecto.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from loguru import logger

_IMPORT_KEYS = {"import_playbook", "ansible.builtin.import_playbook"}
_TARGET = "all"
_VAULT_HEADER = "$ANSIBLE_VAULT;"


class EncryptedPlaybookError(Exception):
    """Un playbook cifrado entero: sus plays no se pueden llevar a la selección."""


def _plays(text: str) -> list[yaml.MappingNode]:
    # ``compose`` no construye valores, así que no necesita las etiquetas de Ansible.
    root = yaml.compose(text, Loader=yaml.SafeLoader)
    if not isinstance(root, yaml.SequenceNode):
        return []
    return [node for node in root.value if isinstance(node, yaml.MappingNode)]


def _scalar_entries(play: yaml.MappingNode, keys: set[str]) -> list[yaml.Node]:
    return [
        value
        for key, value in play.value
        if isinstance(key, yaml.ScalarNode) and key.value in keys
    ]


def _targets_only_all(text: str) -> bool:
    return all(
        isinstance(node, yaml.ScalarNode) and node.value == _TARGET
        for play in _plays(text)
        for node in _scalar_entries(play, {"hosts"})
    )


def retarget_plays(text: str) -> str:
    """Devuelve ``text`` con el ``hosts`` de cada play sustituido por ``all``."""
    spans = {
        (node.start_mark.index, node.end_mark.index)
        for play in _plays(text)
        for node in _scalar_entries(play, {"hosts"})
    }
    rewritten = text
    for start, end in sorted(spans, reverse=True):
        # A block value's span runs up to the next key: keep what separates them.
        value = rewritten[start:end]
        separator = value[len(value.rstrip()) :]
        rewritten = f"{rewritten[:start]}{_TARGET}{separator}{rewritten[end:]}"
    return rewritten


def _imports(text: str) -> list[str]:
    return [
        node.value
        for play in _plays(text)
        for node in _scalar_entries(play, _IMPORT_KEYS)
        if isinstance(node, yaml.ScalarNode) and "{{" not in node.value
    ]


def retarget_playbook(playbook_path: Path, project_dir: Path) -> None:
    """Reescribe el playbook y los que importe, sin salir de ``project_dir``.

    Un fichero que no se puede leer como YAML se deja tal cual: Ansible informará
    del error con sus propias palabras al cargarlo. Uno cifrado con Vault sí se lee
    bien, como un único texto sin plays, así que se rechaza: Ansible lo descifraría
    y sus plays correrían sobre su propio ``hosts``.
    """
    root = project_dir.resolve()
    pending = [playbook_path]
    seen: set[Path] = set()
    while pending:
        path = pending.pop().resolve()
        if path in seen or not path.is_relative_to(root) or not path.is_file():
            continue
        seen.add(path)
        try:
            text = path.read_text(encoding="utf-8")
            if text.startswith(_VAULT_HEADER):
                raise EncryptedPlaybookError(
                    f"Playbook {path.relative_to(root)} is encrypted with Vault: "
                    "encrypt its variables instead of the whole file"
                )
            rewritten = retarget_plays(text)
            if not _targets_only_all(rewritten):
                raise ValueError("hosts could not be rewritten")
            imported = _imports(text)
        except (yaml.YAMLError, UnicodeDecodeError, OSError, ValueError) as exc:
            logger.warning(
                "Plays of a playbook keep their hosts: {}", type(exc).__name__
            )
            continue
        if rewritten != text:
            path.write_text(rewritten, encoding="utf-8")
        pending.extend(path.parent / name for name in imported)
