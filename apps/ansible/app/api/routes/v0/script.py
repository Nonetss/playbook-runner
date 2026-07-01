"""Endpoint que ejecuta un script almacenado contra inventario vía Ansible ``script``.

Flujo:
1. valida sesión (vía ``CurrentUser``);
2. reenvía la cookie al backend ``run.resolveScript`` para obtener el
   contenido del script + la lista de hosts con credenciales;
3. materializa las claves privadas de cada host y el fichero del script en un
   directorio temporal por run;
4. invoca ``ansible_runner`` en modo ad-hoc con ``module="script"``,
   ``module_args=<ruta del script>``, ``host_pattern="all"`` y, opcionalmente,
   privilege escalation;
5. emite los eventos resultantes vía SSE con un ``done`` terminal (o un
   ``error`` si no se puede iniciar).

Tanto el fichero del script como las claves se eliminan en un ``finally``
mediante ``cleanup()``, que borra todo el directorio del run.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from enum import Enum

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.core.config import settings
from app.services.ansible.backend_client import (
    ResolverBackendUnreachableError,
    ResolverCredentiallessError,
    ResolverNotFoundError,
    ResolverValidationError,
    map_resolver_error,
    resolve_script,
)
from app.services.ansible.events import log_event_handler
from app.services.ansible.materialize import (
    cleanup,
    materialize_hosts,
    write_script_file,
)
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig
from app.services.ansible.sse import sse, stream_runner_events

router = APIRouter(prefix="/script", tags=["script"])


class InventoryType(str, Enum):
    GROUP = "group"
    DEVICE = "device"


class Inventory(BaseModel):
    id: str
    type: InventoryType


class ScriptRequest(BaseModel):
    scriptId: str
    inventory: list[Inventory] = Field(min_length=1)
    become: bool = False
    forks: int = Field(default=1, ge=1, le=500)


async def _script_stream(
    request: Request,
    script_request: ScriptRequest,
) -> AsyncGenerator[str, None]:
    """Genera el stream SSE de un script una vez resuelta la selección."""
    cookie = request.headers.get("cookie", "")
    if not cookie:
        yield sse({"error": "Missing session cookie"}, event="error")
        return

    inventory_payload = [
        {"id": item.id, "type": item.type.value} for item in script_request.inventory
    ]

    try:
        bundle = await resolve_script(
            cookie_header=cookie,
            script_id=uuid.UUID(script_request.scriptId),
            inventory=inventory_payload,
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

    materialized = materialize_hosts(bundle.hosts, label=bundle.script.name)
    try:
        script_path = write_script_file(
            materialized.run_dir,
            bundle.script.name,
            bundle.script.content,
            bundle.script.language,
        )

        extravars = {
            "ansible_user": settings.ansible_user,
            "ansible_become_user": settings.ansible_become_user,
            "ansible_become": "true" if script_request.become else "false",
        }
        config = AnsibleRunnerConfig(
            host_pattern="all",
            module="script",
            module_args=str(script_path),
            private_data_dir=str(materialized.run_dir),
            project_dir=str(materialized.run_dir),
            inventory=materialized.inventory,
            forks=script_request.forks,
            extravars=extravars,
            event_handler=log_event_handler,
        )
        runner = AnsibleRunner(config)

        async for chunk in stream_runner_events(runner):
            yield chunk
    finally:
        cleanup(materialized)


@router.post(
    "",
    summary="Run a stored bash script via the Ansible script module",
    description=(
        "Resolves a stored script (id) and an inventory selection via the "
        "backend (no playbook), materializes the script + per-host private "
        "keys for ansible-runner, and runs the Ansible `script` module "
        "(which transfers + executes the script on each host) with optional "
        "`become`. Streams events over SSE; events end with a terminal "
        "`done` (or `error` if the run could not start)."
    ),
    response_description="Server-Sent Events stream (`text/event-stream`).",
)
async def script(
    script_request: ScriptRequest,
    request: Request,
    user: CurrentUser,
) -> StreamingResponse:
    """Resuelve el script + inventario, lo ejecuta vía ``script`` y streamea SSE."""
    return StreamingResponse(
        _script_stream(request, script_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
