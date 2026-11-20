"""Las opciones del ``ansible.cfg`` del repositorio que un run acepta.

Un run de Git usa un ``ANSIBLE_CONFIG`` propio del runner, no el fichero del
repositorio: un commit sin revisar no puede cargar código ni cambiar rutas,
credenciales o la política de claves de host. Aun así, un repositorio ajusta
sus tiempos y reintentos en ese fichero, y un run que los ignora se comporta
distinto que en local.

Aquí se leen solo las opciones de ``ALLOWED``, cada una validada por su tipo, y
se escriben (con el valor normalizado) en el fichero del runner. Ansible aplica
después su precedencia normal: las variables ``ANSIBLE_*`` del runner o del
operador ganan a este fichero, y este gana a los valores por defecto. Cualquier
otra sección o clave se descarta por construcción.
"""

from __future__ import annotations

import configparser
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from app.services.ansible.inventory_vars import nearest_config

Reason = Literal["not_allowed", "runner_controlled", "invalid"]

_MAX_SHOWN = 40


def _seconds(raw: str) -> str:
    """Un número entero de segundos, sin signo."""
    value = raw.strip()
    if not re.fullmatch(r"[0-9]+", value):
        raise ValueError(raw)
    return value


def _boolean(raw: str) -> str:
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on", "t", "y"}:
        return "True"
    if value in {"0", "false", "no", "off", "f", "n"}:
        return "False"
    raise ValueError(raw)


def _gathering(raw: str) -> str:
    value = raw.strip().lower()
    if value not in {"implicit", "explicit", "smart"}:
        raise ValueError(raw)
    return value


Validator = Callable[[str], str]

# La lista blanca es esta tabla: lo que no figura aquí no se aplica nunca.
ALLOWED: dict[tuple[str, str], Validator] = {
    ("defaults", "timeout"): _seconds,
    ("defaults", "task_timeout"): _seconds,
    ("defaults", "gather_timeout"): _seconds,
    ("defaults", "gathering"): _gathering,
    ("ssh_connection", "retries"): _seconds,
    ("ssh_connection", "pipelining"): _boolean,
    ("persistent_connection", "connect_timeout"): _seconds,
    ("persistent_connection", "command_timeout"): _seconds,
    ("persistent_connection", "connect_retry_timeout"): _seconds,
}

# Opciones que el runner o el run ya deciden: se nombran aparte para que el log
# explique por qué no hacen nada.
RUNNER_CONTROLLED: frozenset[tuple[str, str]] = frozenset(
    {
        ("defaults", "forks"),
        ("defaults", "host_key_checking"),
        ("ssh_connection", "ssh_args"),
    }
)


@dataclass(frozen=True)
class Discard:
    """Una opción del repositorio que no se aplica y por qué.

    ``value`` solo se rellena para un valor inválido de una opción de la lista
    blanca; el valor de cualquier otra clave no se conserva.
    """

    section: str
    key: str
    reason: Reason
    value: str | None = None


@dataclass
class ConfigOptions:
    applied: dict[str, dict[str, str]] = field(default_factory=dict)
    discarded: list[Discard] = field(default_factory=list)


def _read(config: Path) -> configparser.ConfigParser | None:
    # Sin ``DEFAULT``: Ansible no hereda claves entre secciones.
    parser = configparser.ConfigParser(
        interpolation=None,
        strict=False,
        inline_comment_prefixes=(";",),
        default_section="\0no-default",
    )
    try:
        parser.read_string(config.read_text(encoding="utf-8"))
    except (configparser.Error, UnicodeDecodeError, OSError):
        return None
    return parser


def load_config_options(playbook_path: Path, project_dir: Path) -> ConfigOptions | None:
    """Las opciones aplicables del ``ansible.cfg`` más cercano al playbook.

    Devuelve ``None`` si no hay fichero o no se puede leer. Nunca falla por el
    contenido: un valor inválido se descarta y el run sigue.
    """
    config = nearest_config(playbook_path, project_dir.resolve())
    if config is None:
        return None
    parser = _read(config)
    if parser is None:
        return None

    options = ConfigOptions()
    for section in parser.sections():
        for key, raw in parser.items(section):
            name = (section, key)
            validator = ALLOWED.get(name)
            if validator is None:
                reason: Reason = (
                    "runner_controlled" if name in RUNNER_CONTROLLED else "not_allowed"
                )
                options.discarded.append(Discard(section, key, reason))
                continue
            try:
                value = validator(raw)
            except ValueError:
                options.discarded.append(
                    Discard(section, key, "invalid", raw.strip()[:_MAX_SHOWN])
                )
                continue
            options.applied.setdefault(section, {})[key] = value
    return options


def render_config(applied: dict[str, dict[str, str]]) -> str:
    """El texto INI del ``ansible.cfg`` del runner con solo las opciones aplicadas."""
    lines: list[str] = []
    for section, values in applied.items():
        lines.append(f"[{section}]")
        lines.extend(f"{key} = {value}" for key, value in values.items())
        lines.append("")
    return "\n".join(lines)
