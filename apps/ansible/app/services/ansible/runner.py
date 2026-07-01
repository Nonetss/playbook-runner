import asyncio
from collections.abc import AsyncGenerator
from typing import Any, TypedDict, cast

import ansible_runner
from ansible_runner.runner import Runner as RunnerHandle
from pydantic import BaseModel, ConfigDict, Field, RootModel

from app.core.config import settings
from app.services.ansible.events import (
    AnsibleEvent,
    CancelCallback,
    EventHandler,
    FinishedCallback,
    StatusHandler,
)


class HostVars(TypedDict, total=False):
    """Variables de conexión de un host dentro del inventario."""

    ansible_connection: str
    ansible_host: str
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
    private_data_dir: str = Field(default=settings.ansible_playbook_path)
    project_dir: str = Field(default=settings.ansible_playbook_path)
    inventory: Inventory = Field(default_factory=Inventory)
    forks: int = Field(default=1)
    ssh_key: str = Field(default="")
    extravars: dict[str, str] = Field(
        default_factory=lambda: {
            "ansible_user": settings.ansible_user,
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
            }
        else:
            kwargs = {
                "playbook": self.playbook,
                "private_data_dir": self.private_data_dir,
                "project_dir": self.project_dir,
                "inventory": self.inventory.root,
                "forks": self.forks,
                "extravars": self.extravars,
            }
        # Solo pasamos opcionales que tengan valor, para no pisar los
        # comportamientos por defecto de ansible-runner con ``None``/``""``.
        if self.ssh_key:
            kwargs["ssh_key"] = self.ssh_key
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

    def run(self) -> RunnerHandle:
        self._result = cast(
            RunnerHandle,
            ansible_runner.run(**self.config.run_kwargs()),
        )
        return self._result

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

        kwargs = self.config.run_kwargs()
        kwargs["event_handler"] = handler

        async def _run() -> None:
            try:
                self._result = cast(
                    RunnerHandle,
                    await asyncio.to_thread(ansible_runner.run, **kwargs),
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
                task.cancel()

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
