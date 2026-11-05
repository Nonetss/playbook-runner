"""Descubrimiento de playbooks en un commit de un mirror.

Un fichero es playbook si es ``.yml``/``.yaml`` bajo ``subdir``, no vive en un
directorio de soporte de Ansible (``roles/``, ``group_vars/``…) ni oculto, y su
valor YAML de primer nivel es una lista de plays (mappings con ``hosts`` o
``import_playbook``).

Un rol es un directorio directamente bajo ``roles/`` con ``tasks/main`` o
``meta/main``. Se listan los que están bajo ``subdir`` o en los ``roles/`` de sus
ancestros, donde un run puede encontrarlos.

Los roles que usa cada playbook salen de leer su YAML: ``roles:``, y
``include_role``/``import_role`` en las tareas del play, siguiendo
``import_playbook``. No se siguen ``include_tasks`` ni las dependencias de un rol.

Las variables que define salen de ``vars`` y ``vars_files`` de cada play y de
``vars`` de cada entrada de ``roles:`` y de ``defaults`` y ``vars`` de esos roles.
El valor no se devuelve si está cifrado, es largo o parece sensible: un ``!vault``
o un ``db_password`` se listan sin valor. Las listas y los diccionarios van en JSON.
Detrás van las que esos roles usan, también dentro de sus ``defaults`` y ``vars``,
sin que nada las defina (``used_only``), según ``role_usage``.
"""

from __future__ import annotations

import json
import posixpath
import re
from collections.abc import Callable, Container, Iterable, Iterator, Mapping
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any

import yaml

from app.services.git.mirror import GitError, list_tree, read_blob, safe_repo_path
from app.services.git.role_usage import assigned_names, used_in_tasks, used_in_template

_EXCLUDED_DIRS = {"roles", "group_vars", "host_vars", "collections"}
_IMPORT_KEYS = ("import_playbook", "ansible.builtin.import_playbook")
_PLAY_KEYS = {"hosts", *_IMPORT_KEYS}
# Playbook content is also shown in the UI; bigger files are not playbooks
# anyone reads in a browser.
MAX_PLAYBOOK_BYTES = 256 * 1024
MAX_PLAYBOOKS = 500
MAX_ROLES = 500
MAX_ROLE_DESCRIPTION_CHARS = 500
_YAML_MAIN = {"main.yml", "main.yaml"}
_YAML_SUFFIXES = (".yml", ".yaml")
_ROLE_TASK_DIRS = {"tasks", "handlers"}
_ROLE_VARIABLE_DIRS = {"defaults", "vars"}
_REQUIREMENTS = ("requirements.yml", "requirements.yaml")
_MAX_IMPORT_DEPTH = 32
_MAX_VARIABLES = 200
_MAX_ROLE_FILES = 200
_MAX_VALUE_CHARS = 200
_MAX_COMPOUND_CHARS = 4096
_MAX_COMPOUND_NODES = 2000
_MAX_COMPOUND_DEPTH = 32
_VARIABLE_NAME = re.compile(r"[A-Za-z_]\w*")
_SENSITIVE_NAME = re.compile(r"pass|pwd|secret|token|key|credential", re.IGNORECASE)
_TASK_LISTS = ("pre_tasks", "tasks", "post_tasks", "handlers")
_TASK_BLOCKS = ("block", "rescue", "always")
_ROLE_TASKS = {
    "include_role",
    "import_role",
    "ansible.builtin.include_role",
    "ansible.builtin.import_role",
}


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
class PlaybookRoleUsage:
    path: str
    roles: list[str] = field(default_factory=list)
    dynamic: bool = False


@dataclass
class DiscoveredVariable:
    name: str
    value: str | None = None
    role: str | None = None
    # Un rol la usa y nada la define: no hay valor que enseñar.
    used_only: bool = False
    # Cómo enviarla al sobrescribirla: ``text``, ``boolean``, ``number`` o ``json``.
    value_type: str = "text"


@dataclass
class PlaybookVariableUsage:
    path: str
    variables: list[DiscoveredVariable] = field(default_factory=list)


@dataclass
class DiscoveredRoles:
    roles: list[DiscoveredRole] = field(default_factory=list)
    requirements_files: list[str] = field(default_factory=list)
    playbook_roles: list[PlaybookRoleUsage] = field(default_factory=list)
    playbook_variables: list[PlaybookVariableUsage] = field(default_factory=list)


class _AnsibleLoader(yaml.SafeLoader):
    """SafeLoader que acepta tags de Ansible (``!vault``, ``!unsafe``…)."""


class _TaggedScalar(str):
    """Escalar con tag de Ansible: el valor de un ``!vault`` nunca se devuelve."""


def _ignore_tag(loader: yaml.SafeLoader, _suffix: str, node: yaml.Node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        return _TaggedScalar(loader.construct_scalar(node))
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    if isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node)
    return None


_AnsibleLoader.add_multi_constructor("!", _ignore_tag)


_ReadYaml = Callable[[str], Any]


@dataclass
class _RoleCode:
    """Lo que hace un rol con las variables, para no releerlo por cada playbook."""

    used: list[str] = field(default_factory=list)
    assigned: set[str] = field(default_factory=set)


_ReadRole = Callable[[str], _RoleCode]


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


def _role_task_name(value: Any) -> Any:
    """Nombre de un ``include_role``/``import_role``, también en forma ``name=x``."""
    if isinstance(value, dict):
        return value.get("name")
    if isinstance(value, str):
        match = re.search(r"(?:^|\s)name=(\S+)", value)
        return match.group(1) if match else None
    return None


def _task_role_names(tasks: Any, seen: set[int]) -> Iterator[Any]:
    # ``seen``: las anclas YAML pueden hacer la estructura cíclica o exponencial.
    if not isinstance(tasks, list) or id(tasks) in seen:
        return
    seen.add(id(tasks))
    for task in tasks:
        if not isinstance(task, dict):
            continue
        for key, value in task.items():
            if key in _ROLE_TASKS:
                yield _role_task_name(value)
            elif key in _TASK_BLOCKS:
                yield from _task_role_names(value, seen)


def _play_role_names(play: dict[Any, Any]) -> Iterator[Any]:
    roles = play.get("roles")
    for role in roles if isinstance(roles, list) else []:
        yield role.get("role", role.get("name")) if isinstance(role, dict) else role
    seen: set[int] = set()
    for key in _TASK_LISTS:
        yield from _task_role_names(play.get(key), seen)


def _imported_path(importer: str, target: str) -> str:
    return posixpath.normpath(posixpath.join(posixpath.dirname(importer), target))


def _plays_of(path: str, read: _ReadYaml) -> Iterator[tuple[str, dict[Any, Any]]]:
    """``(fichero, play)`` de ``path`` y de lo que importa, sin entrar en ciclos."""
    seen: set[str] = set()

    def visit(current: str, depth: int) -> Iterator[tuple[str, dict[Any, Any]]]:
        seen.add(current)
        plays = read(current)
        for play in plays if isinstance(plays, list) else []:
            if not isinstance(play, dict):
                continue
            yield current, play
            target = _import_target(play)
            if (
                isinstance(target, str)
                and "{{" not in target
                and depth < _MAX_IMPORT_DEPTH
                and (imported := _imported_path(current, target)) not in seen
            ):
                yield from visit(imported, depth + 1)

    yield from visit(path, 0)


def _import_target(play: dict[Any, Any]) -> Any:
    return next((play[key] for key in _IMPORT_KEYS if key in play), None)


def _playbook_usage(path: str, read: _ReadYaml) -> PlaybookRoleUsage:
    """Roles de ``path`` y de los playbooks que importa, sin repetir."""
    usage = PlaybookRoleUsage(path=path)
    for _file, play in _plays_of(path, read):
        for name in _play_role_names(play):
            if isinstance(name, str) and "{{" not in name:
                if name not in usage.roles:
                    usage.roles.append(name)
            elif name is not None:
                usage.dynamic = True
        target = _import_target(play)
        if isinstance(target, str) and "{{" in target:
            usage.dynamic = True
    return usage


class _HiddenValue(Exception):
    """El valor compuesto contiene algo que no se enseña, o no acaba nunca."""


def _plain_compound(value: Any) -> Any:
    """Copia de una lista o un diccionario, o ``_HiddenValue``.

    Sin memoria a propósito: las anclas YAML pueden hacerlo cíclico o exponencial,
    y lo cortan el límite de profundidad y el de nodos.
    """
    nodes = 0

    def visit(node: Any, depth: int) -> Any:
        nonlocal nodes
        nodes += 1
        if (
            nodes > _MAX_COMPOUND_NODES
            or depth > _MAX_COMPOUND_DEPTH
            or isinstance(node, _TaggedScalar)
        ):
            raise _HiddenValue
        if isinstance(node, dict):
            if any(_SENSITIVE_NAME.search(str(key)) for key in node):
                raise _HiddenValue
            return {str(key): visit(item, depth + 1) for key, item in node.items()}
        if isinstance(node, list):
            return [visit(item, depth + 1) for item in node]
        return node

    return visit(value, 0)


def _value_type(value: Any) -> str:
    """Tipo con el que una ejecución tiene que enviar el valor para no cambiarlo."""
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int | float):
        return "number"
    return "json" if isinstance(value, dict | list) else "text"


def _shown_value(name: str, value: Any) -> str | None:
    """Texto del valor, o ``None`` si está cifrado, es largo o parece sensible."""
    if (
        value is None
        or isinstance(value, _TaggedScalar)
        or _SENSITIVE_NAME.search(name)
    ):
        return None
    if isinstance(value, dict | list):
        try:
            text = json.dumps(
                _plain_compound(value),
                default=str,
                ensure_ascii=False,
                allow_nan=False,
                separators=(",", ":"),
            )
        except (_HiddenValue, ValueError):
            return None
        return None if len(text) > _MAX_COMPOUND_CHARS else text
    text = (
        value
        if isinstance(value, str)
        else json.dumps(value)
        if isinstance(value, bool | int | float)
        else str(value)
    )
    return None if len(text) > _MAX_VALUE_CHARS else text


def _role_entry_vars(play: dict[Any, Any], name: str) -> Any:
    """``vars`` de la entrada de ``roles:`` con ese nombre: mandan sobre ``defaults``."""
    roles = play.get("roles")
    for role in roles if isinstance(roles, list) else []:
        if isinstance(role, dict) and name in (role.get("role"), role.get("name")):
            return role.get("vars")
    return None


def _nearest_role(file: str, name: str, role_paths: Container[str]) -> str | None:
    """El rol que encontraría una ejecución: el ``roles/`` más cercano al fichero."""
    directory = posixpath.dirname(file)
    while True:
        candidate = posixpath.join(directory, "roles", name)
        if candidate in role_paths:
            return candidate
        if not directory:
            return None
        directory = posixpath.dirname(directory)


def _role_variable_files(role_path: str, tree: Container[str]) -> Iterator[str]:
    for folder in ("defaults", "vars"):
        for extension in ("yml", "yaml"):
            candidate = f"{role_path}/{folder}/main.{extension}"
            if candidate in tree:
                yield candidate
                break


def _files_by_role(
    tree: Iterable[str], role_paths: Container[str]
) -> dict[str, list[str]]:
    """Tareas, handlers, variables y plantillas de cada rol, en el orden del árbol."""
    files: dict[str, list[str]] = {}
    for path in tree:
        parts = path.split("/")
        for index, part in enumerate(parts[:-3]):
            role_path = "/".join(parts[: index + 2])
            if (
                part == "roles"
                and parts[index + 2]
                in {*_ROLE_TASK_DIRS, *_ROLE_VARIABLE_DIRS, "templates"}
                and role_path in role_paths
            ):
                files.setdefault(role_path, []).append(path)
                break
    return files


def _role_code(
    role_path: str,
    files: list[str],
    read: _ReadYaml,
    read_text: Callable[[str], str | None],
) -> _RoleCode:
    code = _RoleCode()
    used: dict[str, None] = {}
    for file in files[:_MAX_ROLE_FILES]:
        folder = file[len(role_path) + 1 :].split("/", 1)[0]
        if folder == "templates":
            text = read_text(file)
            names = used_in_template(text) if text is not None else set()
        elif not file.endswith(_YAML_SUFFIXES):
            continue
        elif folder in _ROLE_VARIABLE_DIRS:
            # Un default puede pedir lo que nada define; lo suyo ya está en la lista.
            names = used_in_tasks(read(file))
        else:
            tasks = read(file)
            names = used_in_tasks(tasks)
            code.assigned |= assigned_names(tasks)
        used.update(dict.fromkeys(sorted(names)))
    code.used = list(used)
    return code


def _playbook_variables(
    path: str,
    read: _ReadYaml,
    role_paths: Container[str],
    tree: Container[str],
    read_role: _ReadRole | None = None,
) -> PlaybookVariableUsage:
    """Variables de ``path``: primero las del play, y una por nombre y procedencia."""
    usage = PlaybookVariableUsage(path=path)
    seen: set[tuple[str, str | None]] = set()

    def add(mapping: Any, role: str | None) -> None:
        for name, value in mapping.items() if isinstance(mapping, dict) else ():
            if (
                isinstance(name, str)
                and _VARIABLE_NAME.fullmatch(name)
                and (name, role) not in seen
                and len(usage.variables) < _MAX_VARIABLES
            ):
                seen.add((name, role))
                usage.variables.append(
                    DiscoveredVariable(
                        name,
                        _shown_value(name, value),
                        role,
                        value_type=_value_type(value),
                    )
                )

    plays = list(_plays_of(path, read))
    for file, play in plays:
        add(play.get("vars"), None)
        files = play.get("vars_files")
        for target in files if isinstance(files, list) else []:
            if isinstance(target, str) and "{{" not in target:
                add(read(_imported_path(file, target)), None)
    declared: list[tuple[str, str]] = []
    for file, play in plays:
        for name in _play_role_names(play):
            if not isinstance(name, str) or "{{" in name:
                continue
            add(_role_entry_vars(play, name), name)
            role_path = _nearest_role(file, name, role_paths)
            if role_path is not None:
                declared.append((name, role_path))
                for variable_file in _role_variable_files(role_path, tree):
                    add(read(variable_file), name)
    if read_role is None:
        return usage

    # Lo que otro rol o el propio play dejan asignado tampoco hay que pedirlo.
    codes = [(name, read_role(role_path)) for name, role_path in declared]
    known = {name for name, _role in seen}
    for _file, play in plays:
        known |= assigned_names([play.get(key) for key in _TASK_LISTS])
    for _name, code in codes:
        known |= code.assigned
    for role, code in codes:
        for name in code.used:
            if name not in known and len(usage.variables) < _MAX_VARIABLES:
                known.add(name)
                usage.variables.append(
                    DiscoveredVariable(name, None, role, used_only=True)
                )
    return usage


def inline_playbook_variables(content: str) -> list[DiscoveredVariable]:
    """Variables de un playbook de un solo fichero: no tiene roles ni ficheros que seguir."""
    if len(content.encode("utf-8")) > MAX_PLAYBOOK_BYTES:
        return []
    try:
        plays = yaml.load(content, Loader=_AnsibleLoader)  # noqa: S506 - SafeLoader subclass
    except (ValueError, RecursionError, yaml.YAMLError):
        return []
    path = "playbook.yml"
    read = lambda file: plays if file == path else None  # noqa: E731
    return _playbook_variables(path, read, (), ()).variables


def _playbook_details(
    repository_id: str,
    commit: str,
    subdir: str,
    tree: Mapping[str, tuple[str, int]],
    role_paths: Container[str],
) -> tuple[list[PlaybookRoleUsage], list[PlaybookVariableUsage]]:
    """Roles y variables de cada playbook de ``subdir`` que declara alguno."""
    cache: dict[str, Any] = {}

    def read(path: str) -> Any:
        if path not in cache:
            cache[path] = _read_yaml(repository_id, tree.get(path))
        return cache[path]

    files = _files_by_role(tree, role_paths)
    role_cache: dict[str, _RoleCode] = {}

    def read_role(role_path: str) -> _RoleCode:
        if role_path not in role_cache:
            role_cache[role_path] = _role_code(
                role_path,
                files.get(role_path, []),
                read,
                lambda file: _read_text(repository_id, tree.get(file)),
            )
        return role_cache[role_path]

    playbooks = discover(repository_id, commit, subdir)
    roles = [_playbook_usage(playbook.path, read) for playbook in playbooks]
    variables = [
        _playbook_variables(playbook.path, read, role_paths, tree, read_role)
        for playbook in playbooks
    ]
    return (
        [usage for usage in roles if usage.roles or usage.dynamic],
        [usage for usage in variables if usage.variables],
    )


def _read_text(repository_id: str, entry: tuple[str, int] | None) -> str | None:
    """Texto de un fichero; cualquier problema significa que no hay nada que seguir."""
    if entry is None or entry[1] > MAX_PLAYBOOK_BYTES:
        return None
    try:
        return read_blob(repository_id, entry[0]).decode("utf-8")
    except (GitError, ValueError):
        return None


def _read_yaml(repository_id: str, entry: tuple[str, int] | None) -> Any:
    """Contenido YAML de un fichero; si no se puede leer, no hay nada que seguir."""
    content = _read_text(repository_id, entry)
    if content is None:
        return None
    try:
        return yaml.load(content, Loader=_AnsibleLoader)  # noqa: S506 - SafeLoader subclass
    except (ValueError, RecursionError, yaml.YAMLError):
        return None


def discover_roles(repository_id: str, commit: str, subdir: str) -> DiscoveredRoles:
    """Lista los roles de ``commit`` y sus ``requirements`` (bloqueante; en un thread)."""
    scope = _subdir_parts(subdir)
    requirements = _requirements_locations(scope)
    names: dict[str, str] = {}
    meta_blobs: dict[str, tuple[str, int]] = {}
    requirements_files: list[str] = []
    tree: dict[str, tuple[str, int]] = {}
    # Todo el árbol: un ``roles/`` por encima de ``subdir`` también cuenta.
    for path, blob, size in list_tree(repository_id, commit, ""):
        tree[path] = (blob, size)
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
    playbook_roles, playbook_variables = _playbook_details(
        repository_id, commit, subdir, tree, names
    )
    return DiscoveredRoles(
        roles=roles,
        requirements_files=sorted(requirements_files),
        playbook_roles=playbook_roles,
        playbook_variables=playbook_variables,
    )
