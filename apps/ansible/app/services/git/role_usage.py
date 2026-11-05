"""Variables que usa el código de un rol, sin ejecutar ni evaluar nada.

Los nombres salen de analizar las plantillas Jinja de sus tareas y ``templates/``.
Es una sugerencia: un nombre creado de forma que no se ve aquí (``include_vars``, un
módulo) aparecerá de más, y uno que se arma en tiempo de ejecución no aparecerá.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from jinja2 import Environment, TemplateError, meta


class _AnyFunction(dict[str, Any]):
    """Filtros y tests: el analizador rechaza los que no conoce, como los de Ansible."""

    def get(self, key: str, default: Any = None) -> Any:
        return _no_function


def _no_function(*_args: Any, **_kwargs: Any) -> None:
    return None


_ENVIRONMENT = Environment(autoescape=False)  # noqa: S701 - solo se analiza, no se renderiza
_ENVIRONMENT.filters = _AnyFunction()
_ENVIRONMENT.tests = _AnyFunction()
# Las aporta Ansible en cada tarea o son funciones de sus plantillas.
_PROVIDED = {
    "environment",
    "group_names",
    "groups",
    "hostvars",
    "inventory_dir",
    "inventory_file",
    "inventory_hostname",
    "inventory_hostname_short",
    "item",
    "lookup",
    "now",
    "omit",
    "play_hosts",
    "playbook_dir",
    "q",
    "query",
    "role_name",
    "role_names",
    "role_path",
    "role_uuid",
    "undef",
    "vars",
    *_ENVIRONMENT.globals,
}
# Se evalúan como expresión aunque no lleven ``{{ }}``.
_BARE_KEYS = {"when", "failed_when", "changed_when", "until", "that"}
_SET_FACT_KEYS = {"set_fact", "ansible.builtin.set_fact"}
_GETENT_KEYS = {"getent", "ansible.builtin.getent"}


def used_in_template(text: str) -> set[str]:
    """Variables que necesita una plantilla; si no se puede analizar, ninguna."""
    try:
        names = meta.find_undeclared_variables(_ENVIRONMENT.parse(text))
    except (TemplateError, RecursionError):
        return set()
    return {
        name
        for name in names
        if name not in _PROVIDED and not name.lower().startswith("ansible_")
    }


def _nodes(node: Any) -> Iterator[Any]:
    # ``seen``: las anclas YAML pueden hacer la estructura cíclica o exponencial.
    seen: set[int] = set()
    pending = [node]
    while pending:
        current = pending.pop()
        if not isinstance(current, dict | list) or id(current) in seen:
            continue
        seen.add(id(current))
        yield current
        pending.extend(current.values() if isinstance(current, dict) else current)


def used_in_tasks(tasks: Any) -> set[str]:
    """Variables que leen unas tareas, en cualquier nivel de su YAML."""
    names: set[str] = set()
    for node in _nodes(tasks):
        items = node.items() if isinstance(node, dict) else ((None, v) for v in node)
        for key, value in items:
            bare = key in _BARE_KEYS
            for text in value if bare and isinstance(value, list) else [value]:
                # Un escalar con tag (``!unsafe``, ``!vault``) no es una plantilla.
                if type(text) is not str:
                    continue
                if "{{" in text or "{%" in text:
                    names |= used_in_template(text)
                elif bare:
                    names |= used_in_template(f"{{{{ {text} }}}}")
    return names


def assigned_names(tasks: Any) -> set[str]:
    """Lo que dejan unas tareas: ``register``, ``set_fact``, ``vars``, ``loop_var``, ``getent``."""
    names: set[str] = set()
    for node in _nodes(tasks):
        if not isinstance(node, dict):
            continue
        for key, value in node.items():
            if key in {"register", "loop_var"} and isinstance(value, str):
                names.add(value)
            elif (key == "vars" or key in _SET_FACT_KEYS) and isinstance(value, dict):
                names |= {name for name in value if isinstance(name, str)}
            elif key in _GETENT_KEYS and isinstance(value, dict):
                # El módulo deja el resultado en ``getent_<database>``.
                database = value.get("database")
                if isinstance(database, str):
                    names.add(f"getent_{database}")
    return names
