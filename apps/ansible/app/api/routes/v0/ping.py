"""Endpoint que ejecuta un ``ansible.builtin.ping`` contra un device.

Flujo:
1. valida sesión (vía ``CurrentUser``);
2. llama al backend ``run.resolveDevice`` con el ``deviceId`` para obtener
   la dirección SSH + credenciales asociadas al device;
3. materializa la clave privada en un fichero ``0600`` por run;
4. invoca ``ansible_runner`` con un playbook de ping embebido;
5. emite los eventos resultantes vía SSE con un ``done`` terminal (o un
   ``error`` si no se puede iniciar).

El fichero materializado se borra siempre en un ``finally``.
"""

from __future__ import annotations

import shutil
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.core.config import settings
from app.services.ansible.backend_client import (
    ResolverBackendUnreachableError,
    ResolverCredentiallessError,
    ResolverNotFoundError,
    ResolverValidationError,
    map_resolver_error,
    resolve_device,
)
from app.services.ansible.events import log_event_handler
from app.services.ansible.materialize import (
    _write_key_file,  # type: ignore[attr-defined]
)
from app.services.ansible.runner import (
    AnsibleRunner,
    AnsibleRunnerConfig,
    HostVars,
    Inventory,
)
from app.services.ansible.sse import sse, stream_runner_events

router = APIRouter(prefix="/ping", tags=["ping"])

_PING_PLAYBOOK = """\
- name: Ping
  hosts: all
  gather_facts: false
  tasks:
    - name: Ping
      ansible.builtin.ping:
"""


class PingRequest(BaseModel):
    deviceId: str


def _build_host_vars(
    host_name: str,
    address: str,
    port: int | None,
    username: str,
    key_path: str,
    connection: str,
) -> HostVars:
    vars: HostVars = {
        "ansible_connection": connection,
        "ansible_host": address,
        "ansible_ssh_private_key_file": key_path,
        "ansible_user": username,
    }
    if port is not None:
        vars["ansible_port"] = port
    return vars


async def _ping_stream(
    device_id: str,
    cookie: str,
) -> AsyncGenerator[str, None]:
    if not cookie:
        yield sse({"error": "Missing session cookie"}, event="error")
        return

    try:
        host = await resolve_device(
            cookie_header=cookie,
            device_id=uuid.UUID(device_id),
        )
    except (
        ResolverNotFoundError,
        ResolverValidationError,
        ResolverCredentiallessError,
        ResolverBackendUnreachableError,
        HTTPException,
    ) as exc:
        http_exc = map_resolver_error(exc)
        yield sse({"error": http_exc.detail}, event="error")
        return

    from pathlib import Path

    scratch = Path(settings.run_scratch_dir)
    scratch.mkdir(parents=True, exist_ok=True)
    run_id = uuid.uuid4().hex[:12]
    run_dir = scratch / f"ping-{host.name}-{run_id}"
    key_dir = run_dir / "keys"
    run_dir.mkdir(parents=True, exist_ok=True)

    playbook_path = run_dir / "ping.yml"
    playbook_path.write_text(_PING_PLAYBOOK, encoding="utf-8")

    try:
        key_path = _write_key_file(key_dir, host.name, host.privateKey)

        host_vars = _build_host_vars(
            host_name=host.name,
            address=host.address,
            port=host.port,
            username=host.username,
            key_path=str(key_path),
            connection=host.connection,
        )
        config = AnsibleRunnerConfig(
            playbook="ping.yml",
            private_data_dir=str(run_dir),
            project_dir=str(run_dir),
            inventory=Inventory({"all": {"hosts": {host.name: host_vars}}}),
            forks=1,
            extravars={},
            event_handler=log_event_handler,
        )
        runner = AnsibleRunner(config)

        async for chunk in stream_runner_events(runner):
            yield chunk
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)


@router.post(
    "",
    summary="Ping a stored device via Ansible",
    description=(
        "Resolves the device's stored SSH credential via the backend, "
        "writes a 0600 key file for this run, and executes a one-task "
        "ping playbook against the device. Streams events over SSE."
    ),
    response_description="Server-Sent Events stream (`text/event-stream`).",
)
async def ping(
    ping_request: PingRequest,
    request: Request,
    user: CurrentUser,
) -> StreamingResponse:
    """Hace ping al device y transmite los eventos vía SSE."""
    cookie = request.headers.get("cookie", "")

    return StreamingResponse(
        _ping_stream(ping_request.deviceId, cookie),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
