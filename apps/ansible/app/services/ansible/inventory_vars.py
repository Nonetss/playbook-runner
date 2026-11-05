"""Las variables del inventario del repositorio, como en una ejecución local.

Ansible carga ``group_vars/`` y ``host_vars/`` de junto al playbook y de junto al
inventario. Un run usa su propio inventario e ignora el ``ansible.cfg`` del
repositorio, así que las que viven junto al inventario que ese fichero declara
no se cargarían: se copian junto al inventario del run, en su propia copia, y
Ansible las aplica con su precedencia normal. Del inventario del repositorio no
se usa nada más: los hosts siguen siendo la selección del run.
"""

from __future__ import annotations

import configparser
import shutil
from pathlib import Path

_VARS_DIRS = ("group_vars", "host_vars")


def _nearest_config(playbook_path: Path, root: Path) -> Path | None:
    """El ``ansible.cfg`` más cercano, desde el playbook hasta la raíz del árbol."""
    directory = playbook_path.parent
    while directory.is_relative_to(root):
        candidate = directory / "ansible.cfg"
        if candidate.is_file() and not candidate.is_symlink():
            return candidate
        directory = directory.parent
    return None


def _declared_entries(config: Path) -> list[str]:
    """Las entradas de ``[defaults] inventory``; nada si no se puede leer."""
    parser = configparser.ConfigParser(
        interpolation=None, strict=False, inline_comment_prefixes=(";",)
    )
    try:
        parser.read_string(config.read_text(encoding="utf-8"))
    except (configparser.Error, UnicodeDecodeError):
        return []
    raw = parser.get("defaults", "inventory", fallback="")
    return [entry.strip() for entry in raw.split(",") if entry.strip()]


def repository_inventories(playbook_path: Path, project_dir: Path) -> list[Path]:
    """Directorios donde Ansible buscaría las variables del inventario declarado.

    Una entrada puede ser un directorio o un fichero (entonces cuenta su
    directorio). Se omite lo que no exista, como una lista de hosts
    (``localhost,``), y lo que salga del árbol.
    """
    root = project_dir.resolve()
    config = _nearest_config(playbook_path, root)
    if config is None:
        return []
    inventories: list[Path] = []
    for entry in _declared_entries(config):
        path = (config.parent / entry).resolve()
        if not path.is_relative_to(root):
            continue
        if path.is_dir():
            inventories.append(path)
        elif path.is_file():
            inventories.append(path.parent)
    return inventories


def _symlinks(directory: str, names: list[str]) -> list[str]:
    return [name for name in names if (Path(directory) / name).is_symlink()]


def copy_inventory_vars(playbook_path: Path, project_dir: Path, run_dir: Path) -> None:
    """Copia las variables del inventario declarado junto al inventario del run.

    ``ansible-runner`` escribe el inventario en ``run_dir/inventory/hosts.json``.
    Un enlace simbólico nunca se copia: podría apuntar fuera del árbol. Con varias
    entradas se copian en orden, y un fichero repetido se queda con la última.
    """
    destination = run_dir / "inventory"
    for inventory in repository_inventories(playbook_path, project_dir):
        for name in _VARS_DIRS:
            source = inventory / name
            if source.is_dir() and not source.is_symlink():
                shutil.copytree(
                    source, destination / name, ignore=_symlinks, dirs_exist_ok=True
                )
