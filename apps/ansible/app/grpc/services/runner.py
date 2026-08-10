"""`RunnerService`: ejecuta una selección ya resuelta por el backend, vía gRPC.

El backend resuelve el playbook/hosts/script/device contra su propia base de
datos (`packages/api/src/v1/run/handler.ts`, la misma lógica que usa el
scheduler de jobs) y llama a una de estas RPCs para ejecutarlo. Ansible no
toca la base de datos ni valida sesión de usuario: solo ejecuta, autenticado
con el ``SERVICE_TOKEN`` compartido.

Reemplaza tanto el antiguo endpoint interno ``POST /api/v0/run/internal``
(ya eliminado, ver ``RunBundle``) como los endpoints HTTP+SSE que el
frontend llamaba directamente contra este servicio (``/v0/ping``, ``/run``,
``/command``, ``/script``, también eliminados): ahora el frontend solo habla
con el backend, que reenvía la ejecución aquí.
"""

from __future__ import annotations

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
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig
from app.services.ansible.sse import event_payload

_PING_PLAYBOOK = """\
- name: Ping
  hosts: all
  gather_facts: false
  tasks:
    - name: Ping
      ansible.builtin.ping:
"""


def _to_run_event(response_type, event: AnsibleEvent):
    """Traduce un evento de ansible-runner a un frame de respuesta `.task`.

    Reutiliza `event_payload()` (compartido con el streaming SSE que usaban
    los antiguos endpoints HTTP) para no duplicar la lógica de recorte.
    """
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

    yield response_type(
        done=Done(status=runner.status, rc=runner.rc or 0, ok=runner.rc == 0)
    )


class RunnerServicer(RunnerServiceServicer):
    async def RunBundle(self, request, context):
        """Ejecuta un playbook contra hosts ya resueltos (used by the job scheduler too)."""
        logger.bind(peer=context.peer()).info("RunBundle recibido")

        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name=request.playbook.name, content=request.playbook.content
            ),
            hosts=[host_from_proto(h) for h in request.hosts],
        )
        materialized = materialize(bundle)
        try:
            extravars = {
                "ansible_user": settings.ansible_user,
                "ansible_become_user": settings.ansible_become_user,
                **dict(request.extravars),
            }
            config = AnsibleRunnerConfig(
                playbook=materialized.playbook_path.name,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars=extravars,
                event_handler=log_event_handler,
            )
            async for event in _stream_runner(AnsibleRunner(config), RunBundleResponse):
                yield event
        finally:
            cleanup(materialized)

    async def RunPing(self, request, context):
        """Ejecuta un `ansible.builtin.ping` embebido contra un único host."""
        logger.bind(peer=context.peer()).info("RunPing recibido")

        host = host_from_proto(request.host)
        materialized = materialize_hosts([host], label=f"ping-{host.name}")
        try:
            playbook_path = materialized.run_dir / "ping.yml"
            playbook_path.write_text(_PING_PLAYBOOK, encoding="utf-8")

            config = AnsibleRunnerConfig(
                playbook=playbook_path.name,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=1,
                extravars={},
                event_handler=log_event_handler,
            )
            async for event in _stream_runner(AnsibleRunner(config), RunPingResponse):
                yield event
        finally:
            cleanup(materialized)

    async def RunCommand(self, request, context):
        """Ejecuta un módulo ad-hoc (`shell`/`command`) contra hosts ya resueltos."""
        logger.bind(peer=context.peer()).info("RunCommand recibido")

        hosts = [host_from_proto(h) for h in request.hosts]
        materialized = materialize_hosts(hosts, label="command")
        try:
            extravars = {
                "ansible_user": settings.ansible_user,
                "ansible_become_user": settings.ansible_become_user,
                "ansible_become": "true" if request.become else "false",
            }
            config = AnsibleRunnerConfig(
                host_pattern="all",
                module=request.module,
                module_args=request.command,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars=extravars,
                event_handler=log_event_handler,
            )
            async for event in _stream_runner(
                AnsibleRunner(config), RunCommandResponse
            ):
                yield event
        finally:
            cleanup(materialized)

    async def RunScript(self, request, context):
        """Ejecuta un script ya resuelto (módulo `script`) contra hosts ya resueltos."""
        logger.bind(peer=context.peer()).info("RunScript recibido")

        hosts = [host_from_proto(h) for h in request.hosts]
        materialized = materialize_hosts(hosts, label=request.script.name)
        try:
            script_path = write_script_file(
                materialized.run_dir,
                request.script.name,
                request.script.content,
                request.script.language or "bash",
            )
            extravars = {
                "ansible_user": settings.ansible_user,
                "ansible_become_user": settings.ansible_become_user,
                "ansible_become": "true" if request.become else "false",
            }
            config = AnsibleRunnerConfig(
                host_pattern="all",
                module="script",
                module_args=str(script_path),
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.run_dir),
                inventory=materialized.inventory,
                forks=request.forks or 1,
                extravars=extravars,
                event_handler=log_event_handler,
            )
            async for event in _stream_runner(AnsibleRunner(config), RunScriptResponse):
                yield event
        finally:
            cleanup(materialized)
