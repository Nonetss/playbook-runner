"""`RunnerService`: ejecuta una selección ya resuelta por el backend, vía gRPC.

El backend resuelve el playbook/hosts/script/device contra su propia base de
datos (`packages/api/src/v1/run/resolve.ts`, la misma lógica que usa el
scheduler de jobs) y llama a una de estas RPCs para ejecutarlo. Ansible no
toca la base de datos ni valida sesión de usuario: solo ejecuta, autenticado
con el ``SERVICE_TOKEN`` compartido.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable

import grpc
from loguru import logger

from app.core.config import settings
from app.grpc.stubs import (
    Done,
    RunBundleResponse,
    RunCommandResponse,
    RunnerServiceServicer,
    RunPingResponse,
    RunScriptResponse,
    Stats,
    TaskEvent,
)
from app.services.ansible.events import AnsibleEvent, log_event_handler
from app.services.ansible.materialize import (
    MaterializedHosts,
    MaterializedRun,
    cleanup,
    materialize,
    materialize_hosts,
    write_script_file,
)
from app.services.ansible.models import (
    ResolvedPlaybook,
    ResolvedRunBundle,
    host_from_proto,
)
from app.services.ansible.payload import event_payload
from app.services.ansible.runner import (
    RUN_SLOTS,
    AnsibleRunner,
    AnsibleRunnerConfig,
)

_PING_PLAYBOOK = """\
- name: Ping
  hosts: all
  gather_facts: false
  tasks:
    - name: Ping
      ansible.builtin.ping:
"""


def _to_run_event(response_type, event: AnsibleEvent):
    """Traduce un evento de ansible-runner a un frame de respuesta `.task`."""
    payload = event_payload(event)
    stats_payload = payload.pop("stats", None)
    stats = None
    if isinstance(stats_payload, dict):
        stats = Stats(
            ok=stats_payload.get("ok", {}),
            changed=stats_payload.get("changed", {}),
            failures=stats_payload.get("failures", {}),
            dark=stats_payload.get("dark", {}),
            skipped=stats_payload.get("skipped", {}),
        )
    return response_type(task=TaskEvent(stats=stats, **payload))


async def _stream_runner(runner: AnsibleRunner, response_type):
    """Stream de un `AnsibleRunner`: eventos + `done`/`error` terminal."""
    try:
        async for event in runner.stream():
            yield _to_run_event(response_type, event)
    except Exception as exc:  # noqa: BLE001 - se reporta al cliente
        yield response_type(error=str(exc))
        return

    # rc is None when ansible-runner never produced one (e.g. canceled).
    rc = runner.rc if runner.rc is not None else -1
    yield response_type(done=Done(status=runner.status, rc=rc, ok=rc == 0))


async def _serve[M: (MaterializedHosts, MaterializedRun)](
    context: grpc.aio.ServicerContext,
    response_type,
    prepare: Callable[[], M],
    build_config: Callable[[M], Awaitable[AnsibleRunnerConfig]],
) -> AsyncIterator[object]:
    """Common RPC lifecycle: take a run slot, materialize, stream, clean up.

    Fails fast with ``RESOURCE_EXHAUSTED`` when every slot is busy. The
    generator's ``finally`` blocks run innermost-first, so ``cleanup`` (key
    files, run dir) only happens after ``AnsibleRunner.stream()`` has waited
    for the worker thread to exit, and the slot is released last.
    """
    if RUN_SLOTS.locked():
        await context.abort(
            grpc.StatusCode.RESOURCE_EXHAUSTED,
            "Too many concurrent runs, try again later",
        )
    await RUN_SLOTS.acquire()
    try:
        materialized = await asyncio.to_thread(prepare)
        try:
            config = await build_config(materialized)
            async for frame in _stream_runner(AnsibleRunner(config), response_type):
                yield frame
        finally:
            await asyncio.to_thread(cleanup, materialized)
    finally:
        RUN_SLOTS.release()


class RunnerServicer(RunnerServiceServicer):
    async def RunBundle(self, request, context):
        """Ejecuta un playbook contra hosts ya resueltos (used by the job scheduler too)."""
        logger.bind(peer=context.peer()).info("RunBundle recibido")

        # Extra vars override everything in Ansible: ``ansible_*`` keys could
        # change how and where we connect, so they are reserved (the backend
        # validates this too; jobs stored before that check land here).
        reserved = sorted(
            k for k in request.extravars if k.lower().startswith("ansible_")
        )
        if reserved:
            yield RunBundleResponse(
                error=f"Reserved extra vars are not allowed: {', '.join(reserved)}"
            )
            return

        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name=request.playbook.name, content=request.playbook.content
            ),
            hosts=[host_from_proto(h) for h in request.hosts],
        )

        async def build_config(materialized: MaterializedRun) -> AnsibleRunnerConfig:
            return AnsibleRunnerConfig(
                playbook=materialized.playbook_path.name,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars={
                    "ansible_become_user": settings.ansible_become_user,
                    **dict(request.extravars),
                },
                event_handler=log_event_handler,
            )

        async for frame in _serve(
            context, RunBundleResponse, lambda: materialize(bundle), build_config
        ):
            yield frame

    async def RunPing(self, request, context):
        """Ejecuta un `ansible.builtin.ping` embebido contra un único host."""
        logger.bind(peer=context.peer()).info("RunPing recibido")

        host = host_from_proto(request.host)

        def prepare() -> MaterializedHosts:
            materialized = materialize_hosts([host], label=f"ping-{host.name}")
            (materialized.run_dir / "ping.yml").write_text(
                _PING_PLAYBOOK, encoding="utf-8"
            )
            return materialized

        async def build_config(materialized: MaterializedHosts) -> AnsibleRunnerConfig:
            return AnsibleRunnerConfig(
                playbook="ping.yml",
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=1,
                extravars={},
                event_handler=log_event_handler,
            )

        async for frame in _serve(context, RunPingResponse, prepare, build_config):
            yield frame

    async def RunCommand(self, request, context):
        """Ejecuta un módulo ad-hoc (`shell`/`command`) contra hosts ya resueltos."""
        logger.bind(peer=context.peer()).info("RunCommand recibido")

        hosts = [host_from_proto(h) for h in request.hosts]

        async def build_config(materialized: MaterializedHosts) -> AnsibleRunnerConfig:
            return AnsibleRunnerConfig(
                host_pattern="all",
                module=request.module,
                module_args=request.command,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars={
                    "ansible_become_user": settings.ansible_become_user,
                    "ansible_become": "true" if request.become else "false",
                },
                event_handler=log_event_handler,
            )

        async for frame in _serve(
            context,
            RunCommandResponse,
            lambda: materialize_hosts(hosts, label="command"),
            build_config,
        ):
            yield frame

    async def RunScript(self, request, context):
        """Ejecuta un script ya resuelto (módulo `script`) contra hosts ya resueltos."""
        logger.bind(peer=context.peer()).info("RunScript recibido")

        hosts = [host_from_proto(h) for h in request.hosts]

        async def build_config(materialized: MaterializedHosts) -> AnsibleRunnerConfig:
            script_path = await asyncio.to_thread(
                write_script_file,
                materialized.run_dir,
                request.script.name,
                request.script.content,
                request.script.language or "bash",
            )
            return AnsibleRunnerConfig(
                host_pattern="all",
                module="script",
                module_args=str(script_path),
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars={
                    "ansible_become_user": settings.ansible_become_user,
                    "ansible_become": "true" if request.become else "false",
                },
                event_handler=log_event_handler,
            )

        async for frame in _serve(
            context,
            RunScriptResponse,
            lambda: materialize_hosts(hosts, label=request.script.name),
            build_config,
        ):
            yield frame
