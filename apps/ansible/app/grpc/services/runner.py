"""`RunnerService`: ejecuta una selección ya resuelta por el backend, vía gRPC.

El backend resuelve el playbook/hosts/script/device contra su propia base de
datos (`packages/api/src/v1/run/resolve.ts`, la misma lógica que usa el
scheduler de jobs) y llama a una de estas RPCs para ejecutarlo. Ansible no
toca la base de datos ni valida sesión de usuario: solo ejecuta, autenticado
con el ``SERVICE_TOKEN`` compartido.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable
from typing import cast

import grpc
from loguru import logger

from app.core.config import settings
from app.grpc.stubs import (
    DeleteRepositoryResponse,
    Done,
    Heartbeat,
    ListBranchesResponse,
    PlaybookFile,
    RunBundleResponse,
    RunCommandResponse,
    RunnerServiceServicer,
    RunPingResponse,
    RunScriptResponse,
    Stats,
    SyncRepositoryResponse,
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
    ResolvedRunBundle,
    host_from_proto,
    playbook_from_proto,
)
from app.services.ansible.payload import event_payload
from app.services.ansible.runner import (
    RUN_SLOTS,
    AnsibleRunner,
    AnsibleRunnerConfig,
)
from app.services.git import mirror
from app.services.git.discover import discover
from app.services.git.mirror import GitError

_GIT_STATUS = {
    "invalid": grpc.StatusCode.INVALID_ARGUMENT,
    "not_found": grpc.StatusCode.NOT_FOUND,
    "unavailable": grpc.StatusCode.UNAVAILABLE,
}

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


async def _with_heartbeats[T](
    frames: AsyncGenerator[T, None],
    interval_s: float,
    heartbeat: Callable[[], T],
) -> AsyncIterator[T]:
    """Forwards ``frames`` and yields ``heartbeat()`` after every ``interval_s``
    without one, so a silent task never leaves the stream idle.

    ``frames`` runs in a pump task: timing out a direct ``__anext__`` would
    cancel the run. On close or cancellation the pump is cancelled and awaited,
    so the inner ``finally`` chain (stop ansible-runner, cleanup, release the
    slot) completes before the RPC ends. Inner exceptions, ``context.abort``
    included, are re-raised here.
    """
    queue: asyncio.Queue[tuple[bool, object]] = asyncio.Queue(maxsize=1)
    end = object()

    async def pump() -> None:
        try:
            async for frame in frames:
                await queue.put((True, frame))
            await queue.put((True, end))
        except Exception as exc:  # noqa: BLE001 - re-raised by the consumer
            await queue.put((False, exc))
        finally:
            await frames.aclose()

    task = asyncio.create_task(pump())
    try:
        while True:
            try:
                ok, item = await asyncio.wait_for(queue.get(), interval_s)
            except TimeoutError:
                yield heartbeat()
                continue
            if not ok:
                raise cast(Exception, item)
            if item is end:
                return
            yield cast(T, item)
    finally:
        task.cancel()
        await asyncio.wait([task])


def _heartbeats[T](frames: AsyncGenerator[T, None], response_type) -> AsyncIterator[T]:
    return _with_heartbeats(
        frames,
        settings.run_heartbeat_interval_s,
        lambda: response_type(heartbeat=Heartbeat()),
    )


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
        async for frame in _heartbeats(
            self._run_bundle(request, context), RunBundleResponse
        ):
            yield frame

    async def _run_bundle(self, request, context):
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
            playbook=playbook_from_proto(request.playbook),
            hosts=[host_from_proto(h) for h in request.hosts],
        )

        # A fresh state volume has no mirror: fetch the pinned commit first.
        git = bundle.playbook.git
        if git is not None:
            try:
                await mirror.ensure_commit(
                    git.repository_id, git.url, git.commit, git.private_key
                )
            except GitError as exc:
                yield RunBundleResponse(error=str(exc))
                return

        async def build_config(materialized: MaterializedRun) -> AnsibleRunnerConfig:
            return AnsibleRunnerConfig(
                playbook=materialized.playbook,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.project_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars={
                    "ansible_become_user": settings.ansible_become_user,
                    **dict(request.extravars),
                },
                envvars=materialized.envvars,
                event_handler=log_event_handler,
            )

        async for frame in _serve(
            context, RunBundleResponse, lambda: materialize(bundle), build_config
        ):
            yield frame

    async def RunPing(self, request, context):
        async for frame in _heartbeats(
            self._run_ping(request, context), RunPingResponse
        ):
            yield frame

    async def _run_ping(self, request, context):
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
        async for frame in _heartbeats(
            self._run_command(request, context), RunCommandResponse
        ):
            yield frame

    async def _run_command(self, request, context):
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
        async for frame in _heartbeats(
            self._run_script(request, context), RunScriptResponse
        ):
            yield frame

    async def _run_script(self, request, context):
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

    async def SyncRepository(self, request, context):
        """Fetch de la rama al mirror y descubrimiento de playbooks en su cabeza."""
        logger.bind(peer=context.peer(), repository=request.repository_id).info(
            "SyncRepository recibido"
        )
        if mirror.SYNC_SLOTS.locked():
            await context.abort(
                grpc.StatusCode.RESOURCE_EXHAUSTED,
                "Too many concurrent syncs, try again later",
            )
        async with mirror.SYNC_SLOTS:
            try:
                commit = await mirror.sync(
                    request.repository_id,
                    request.url,
                    request.branch or "main",
                    request.private_key if request.HasField("private_key") else None,
                )
                found = await asyncio.to_thread(
                    discover, request.repository_id, commit, request.subdir
                )
            except GitError as exc:
                await context.abort(_GIT_STATUS[exc.kind], str(exc))
        return SyncRepositoryResponse(
            commit=commit,
            playbooks=[PlaybookFile(path=p.path, content=p.content) for p in found],
        )

    async def ListBranches(self, request, context):
        """Ramas de un remoto (``git ls-remote``) para elegir una en el formulario."""
        logger.bind(peer=context.peer()).info("ListBranches recibido")
        try:
            branches, default = await asyncio.to_thread(
                mirror.list_branches,
                request.url,
                request.private_key if request.HasField("private_key") else None,
            )
        except GitError as exc:
            await context.abort(_GIT_STATUS[exc.kind], str(exc))
        return ListBranchesResponse(branches=branches, default_branch=default)

    async def DeleteRepository(self, request, context):
        """Borra el mirror de un repositorio eliminado en el backend."""
        logger.bind(peer=context.peer(), repository=request.repository_id).info(
            "DeleteRepository recibido"
        )
        try:
            await mirror.delete(request.repository_id)
        except GitError as exc:
            await context.abort(_GIT_STATUS[exc.kind], str(exc))
        return DeleteRepositoryResponse()
