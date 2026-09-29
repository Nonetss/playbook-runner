import asyncio
import functools
import os
import signal
import threading
from collections.abc import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, TypedDict, cast

import ansible_runner
from ansible_runner.runner import Runner as RunnerHandle
from loguru import logger
from pydantic import BaseModel, ConfigDict, Field, RootModel

from app.core.config import settings
from app.services.ansible.events import (
    AnsibleEvent,
    CancelCallback,
    EventHandler,
    FinishedCallback,
    StatusHandler,
)
from app.services.ansible.ssh_policy import ssh_envvars

# Dedicated pool for ansible-runner worker threads (one per run) plus the
# matching admission counter the gRPC servicer takes before materializing.
RUN_EXECUTOR = ThreadPoolExecutor(
    max_workers=settings.max_concurrent_runs, thread_name_prefix="ansible-run"
)
RUN_SLOTS = asyncio.Semaphore(settings.max_concurrent_runs)
# How long a canceled run may take to stop before we proceed with cleanup.
CANCEL_WAIT_S = 30.0


def _kill_run_processes(marker: str) -> int:
    """SIGKILL every process whose command line mentions ``marker`` (the run's
    unique private_data_dir) plus all of its descendants. Linux-only (/proc).
    """
    proc = Path("/proc")
    if not proc.is_dir() or not marker:
        return 0
    needle = marker.encode()
    children: dict[int, list[int]] = {}
    roots: list[int] = []
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        try:
            stat = (entry / "stat").read_text()
            cmdline = (entry / "cmdline").read_bytes()
        except OSError:
            continue
        # Field 4 of /proc/<pid>/stat; the command name may contain spaces.
        ppid = int(stat.rsplit(")", 1)[1].split()[1])
        children.setdefault(ppid, []).append(pid)
        if needle in cmdline and pid != os.getpid():
            roots.append(pid)

    targets: set[int] = set()
    stack = roots
    while stack:
        pid = stack.pop()
        if pid not in targets:
            targets.add(pid)
            stack.extend(children.get(pid, []))
    for pid in targets:
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass
    return len(targets)


class HostVars(TypedDict, total=False):
    """Variables de conexión de un host dentro del inventario."""

    ansible_connection: str
    ansible_host: str
    ansible_port: int
    ansible_user: str
    ansible_become_user: str
    ansible_ssh_private_key_file: str


class Inventory(RootModel[dict[str, Any]]):
    """
    Inventario Ansible en formato JSON.

    ansible_runner lo serializa como ``inventory/hosts.json`` dentro de
    ``private_data_dir``.
    """

    root: dict[str, Any] = Field(default_factory=dict)


class AnsibleRunnerConfig(BaseModel):
    # Los callbacks son objetos arbitrarios (no serializables por pydantic).
    model_config = ConfigDict(arbitrary_types_allowed=True)

    playbook: str = Field(default="ping.yml")
    private_data_dir: str
    project_dir: str
    inventory: Inventory = Field(default_factory=Inventory)
    forks: int = Field(default=1)
    # ``ansible_user`` comes from each host's inventory entry, never from
    # extravars (they would override the per-credential user).
    extravars: dict[str, str] = Field(
        default_factory=lambda: {
            "ansible_become_user": settings.ansible_become_user,
        }
    )
    event_handler: EventHandler | None = None
    status_handler: StatusHandler | None = None
    finished_callback: FinishedCallback | None = None
    cancel_callback: CancelCallback | None = None

    # Ad-hoc mode (no playbook): ansible-runner accepts ``host_pattern``,
    # ``module`` and ``module_args`` directly. When any of these are set,
    # ``run_kwargs`` switches to ad-hoc mode and drops the ``playbook`` key.
    host_pattern: str | None = None
    module: str | None = None
    module_args: str | None = None

    def run_kwargs(self) -> dict[str, Any]:
        if self.module:
            kwargs: dict[str, Any] = {
                "host_pattern": self.host_pattern or "all",
                "module": self.module,
                "module_args": self.module_args or "",
                "private_data_dir": self.private_data_dir,
                "project_dir": self.project_dir,
                "inventory": self.inventory.root,
                "forks": self.forks,
                "extravars": self.extravars,
                "envvars": ssh_envvars(),
            }
        else:
            kwargs = {
                "playbook": self.playbook,
                "private_data_dir": self.private_data_dir,
                "project_dir": self.project_dir,
                "inventory": self.inventory.root,
                "forks": self.forks,
                "extravars": self.extravars,
                "envvars": ssh_envvars(),
            }
        # Solo pasamos opcionales que tengan valor, para no pisar los
        # comportamientos por defecto de ansible-runner con ``None``/``""``.
        if self.event_handler is not None:
            kwargs["event_handler"] = self.event_handler
        if self.status_handler is not None:
            kwargs["status_handler"] = self.status_handler
        if self.finished_callback is not None:
            kwargs["finished_callback"] = self.finished_callback
        if self.cancel_callback is not None:
            kwargs["cancel_callback"] = self.cancel_callback
        return kwargs


class AnsibleRunner:
    def __init__(self, config: AnsibleRunnerConfig) -> None:
        self.config = config
        self._result: RunnerHandle | None = None

    async def stream(self) -> AsyncGenerator[AnsibleEvent, None]:
        """Ejecuta el playbook en un hilo y va emitiendo cada evento.

        ansible-runner llama al ``event_handler`` de forma síncrona desde el
        hilo de ejecución; hacemos de puente con una ``asyncio.Queue`` mediante
        ``call_soon_threadsafe``. Al terminar, ``status`` y ``rc`` ya están
        disponibles. Si la config trae su propio ``event_handler``, se respeta.
        """
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[AnsibleEvent | None] = asyncio.Queue()
        user_handler = self.config.event_handler

        def handler(event: AnsibleEvent) -> None:
            if user_handler is not None:
                user_handler(event)
            loop.call_soon_threadsafe(queue.put_nowait, event)

        # ansible-runner polls ``cancel_callback`` and terminates the process
        # tree when it returns True. ``task.cancel()`` alone cannot interrupt
        # the worker thread.
        cancel_event = threading.Event()
        user_cancel = self.config.cancel_callback

        def should_cancel() -> bool:
            return cancel_event.is_set() or bool(user_cancel and user_cancel())

        kwargs = self.config.run_kwargs()
        kwargs["event_handler"] = handler
        kwargs["cancel_callback"] = should_cancel

        async def _run() -> None:
            try:
                self._result = cast(
                    RunnerHandle,
                    await loop.run_in_executor(
                        RUN_EXECUTOR, functools.partial(ansible_runner.run, **kwargs)
                    ),
                )
            finally:
                # Centinela para cerrar el generador pase lo que pase.
                loop.call_soon_threadsafe(queue.put_nowait, None)

        task = asyncio.create_task(_run())
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield event
            await task
        finally:
            if not task.done():
                # The consumer went away (client cancel, disconnect, error):
                # stop Ansible and wait for the thread so callers can safely
                # delete the key files afterwards.
                cancel_event.set()
                logger.info("run canceled, waiting for ansible-runner to stop")
                try:
                    await asyncio.wait_for(asyncio.shield(task), CANCEL_WAIT_S)
                except TimeoutError:
                    logger.warning(
                        "ansible-runner did not stop within {}s", CANCEL_WAIT_S
                    )
                except Exception:  # noqa: BLE001 - the run failed while stopping
                    logger.opt(exception=True).debug("run ended with an error")
                # ansible-runner only kills the main ``ansible`` process group;
                # Ansible's per-host workers (and their ssh/commands) survive.
                killed = await asyncio.to_thread(
                    _kill_run_processes, self.config.private_data_dir
                )
                if killed:
                    logger.info("killed {} leftover ansible process(es)", killed)

    @property
    def status(self) -> str:
        if self._result is None:
            return "unstarted"
        return self._result.status

    @property
    def rc(self) -> int | None:
        if self._result is None:
            return None
        return self._result.rc
