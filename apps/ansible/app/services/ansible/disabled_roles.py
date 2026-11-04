"""Desactiva roles en la copia de un run, sin tocar el YAML del playbook.

Un rol desactivado se deja sin tareas ni dependencias, así da igual cómo se le
llame (``roles:``, ``include_role``, ``import_role``, ``tasks_from``). Se conservan
sus ``defaults``, ``vars`` y ``handlers``, de los que pueden depender otros roles.
El árbol viene del repositorio: un enlace simbólico se sustituye, nunca se escribe
a través de él.
"""

from __future__ import annotations

import os
from collections.abc import Iterable
from pathlib import Path

from app.services.git.mirror import GitError

_NO_TASKS = "[]\n"
_NO_DEPENDENCIES = "dependencies: []\n"


def is_valid_role_name(name: str) -> bool:
    """Un único componente de ruta: el nombre se usa para localizar el directorio."""
    return bool(name) and name not in {".", ".."} and not set(name) & {"/", "\0"}


def _replace(path: Path, content: str) -> None:
    path.unlink()
    path.write_text(content, encoding="utf-8")


def _empty_tasks(tasks: Path) -> None:
    if tasks.is_symlink() or tasks.is_file():
        tasks.unlink()
    if not tasks.is_dir():
        tasks.mkdir(parents=True)
        (tasks / "main.yml").write_text(_NO_TASKS, encoding="utf-8")
        return
    # Vaciados y no borrados: ``tasks_from`` tiene que seguir encontrándolos.
    for directory, subdirs, files in os.walk(tasks):
        base = Path(directory)
        for name in files:
            _replace(base / name, _NO_TASKS)
        for name in subdirs:
            if (base / name).is_symlink():
                (base / name).unlink()


def _clear_meta(meta: Path) -> None:
    if meta.is_symlink():
        meta.unlink()
    if not meta.is_dir():
        return
    for path in meta.iterdir():
        if path.is_dir() and not path.is_symlink():
            continue
        if path.stem == "main":
            _replace(path, _NO_DEPENDENCIES)
        elif path.stem == "argument_specs":
            # Exigiría variables a un rol que ya no va a correr.
            path.unlink()


def _disable(role: Path) -> None:
    if role.is_symlink():
        role.unlink()
    _empty_tasks(role / "tasks")
    _clear_meta(role / "meta")


def disable_roles(project_dir: Path, names: Iterable[str]) -> None:
    """Desactiva ``names`` en todos los ``roles/`` del árbol.

    Un rol que no aparece es un error: ejecutar con otro árbol del esperado podría
    lanzar justo lo que se quería evitar.
    """
    wanted = set(names)
    if not wanted:
        return
    invalid = sorted(name for name in wanted if not is_valid_role_name(name))
    if invalid:
        raise GitError("invalid", f"Invalid role names: {', '.join(invalid)}")

    found: set[str] = set()
    # ``os.walk`` no entra en enlaces simbólicos, pero sí los lista en ``subdirs``.
    for directory, subdirs, _files in os.walk(project_dir):
        if Path(directory).name != "roles":
            continue
        for name in wanted & set(subdirs):
            _disable(Path(directory) / name)
            found.add(name)

    missing = sorted(wanted - found)
    if missing:
        raise GitError("not_found", f"Roles not found: {', '.join(missing)}")
