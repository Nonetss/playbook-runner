"""Tipos y handlers para los eventos que emite ansible-runner.

ansible-runner invoca ``event_handler`` con un diccionario por cada evento del
playbook. Aquí lo modelamos con ``TypedDict`` para tener autocompletado y
comprobación estática, y ofrecemos handlers por defecto basados en ``logging``.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Literal, TypedDict

from ansible_runner.runner import Runner as RunnerHandle

logger = logging.getLogger("app.services.ansible")

# Nombres de evento más habituales. Es un Literal informativo: el campo se tipa
# como ``str`` para no romper ante eventos menos comunes (verbose, warning...).
AnsibleEventName = Literal[
    "playbook_on_start",
    "playbook_on_play_start",
    "playbook_on_task_start",
    "runner_on_start",
    "runner_on_ok",
    "runner_on_failed",
    "runner_on_skipped",
    "runner_on_unreachable",
    "runner_on_async_ok",
    "runner_item_on_ok",
    "runner_item_on_failed",
    "playbook_on_stats",
]


class TaskResult(TypedDict, total=False):
    """Resultado (``res``) de una tarea para un host concreto."""

    changed: bool
    failed: bool
    skipped: bool
    unreachable: bool
    msg: str
    stdout: str
    stderr: str
    rc: int


class AnsibleEventData(TypedDict, total=False):
    """Contenido de ``event_data`` dentro de un evento."""

    play: str
    play_uuid: str
    play_pattern: str
    task: str
    task_uuid: str
    task_action: str
    task_path: str
    host: str
    remote_addr: str
    res: TaskResult
    # Presentes en ``playbook_on_stats`` (host -> contador).
    changed: dict[str, int]
    ok: dict[str, int]
    failures: dict[str, int]
    dark: dict[str, int]
    skipped: dict[str, int]


class AnsibleEvent(TypedDict, total=False):
    """Evento individual emitido por ansible-runner."""

    event: str
    event_data: AnsibleEventData
    uuid: str
    counter: int
    stdout: str
    start_line: int
    end_line: int
    pid: int
    created: str


# Firmas de los callbacks que acepta ``ansible_runner.run``.
EventHandler = Callable[[AnsibleEvent], None]
StatusHandler = Callable[[dict[str, Any], Any], None]
FinishedCallback = Callable[[RunnerHandle], None]
CancelCallback = Callable[[], bool]


def log_event_handler(event: AnsibleEvent) -> None:
    """Handler por defecto: vuelca los eventos relevantes vía ``logging``."""
    event_type = event.get("event", "")
    data = event.get("event_data", {})

    if event_type == "playbook_on_play_start":
        logger.info("[PLAY] %s", data.get("play", ""))
    elif event_type == "playbook_on_task_start":
        logger.info("[TASK] %s", data.get("task", ""))
    elif event_type == "runner_on_ok":
        res = data.get("res", {})
        state = "CHANGED" if res.get("changed", False) else "OK"
        logger.info("  [%s] %s", state, data.get("host", ""))
    elif event_type == "runner_on_skipped":
        logger.info("  [SKIPPED] %s", data.get("host", ""))
    elif event_type == "runner_on_failed":
        res = data.get("res", {})
        logger.error("  [FAILED] %s: %s", data.get("host", ""), res.get("msg", ""))
    elif event_type == "runner_on_unreachable":
        res = data.get("res", {})
        logger.error("  [UNREACHABLE] %s: %s", data.get("host", ""), res.get("msg", ""))
    elif event_type == "playbook_on_stats":
        logger.info("[STATS] Playbook finalizado")


def log_finished_callback(runner: RunnerHandle) -> None:
    """Callback por defecto al terminar la ejecución."""
    logger.info("Ejecución finalizada: status=%s rc=%s", runner.status, runner.rc)
