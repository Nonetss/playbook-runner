"""Endpoint que ejecuta un playbook seleccionado contra inventario.

Flujo:
1. valida sesión (via ``CurrentUser``);
2. reenvía la cookie al backend para resolver el bundle (playbook + hosts +
   credenciales), expandiendo grupos a devices;
3. materializa playbook y claves en ficheros ``0600`` por run;
4. invoca ``ansible_runner`` con el inventario construido;
5. emite los eventos resultantes vía SSE con un ``done`` terminal (o un
   ``error`` si no se puede iniciar).

Los ficheros materializados se borran siempre en un ``finally``.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from enum import Enum
from uuid import UUID

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
    resolve_run,
)
from app.services.ansible.events import log_event_handler
from app.services.ansible.materialize import cleanup, materialize
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig
from app.services.ansible.sse import sse, stream_runner_events

router = APIRouter(prefix="/run", tags=["run"])


class InventoryType(str, Enum):
    GROUP = "group"
    DEVICE = "device"


class Inventory(BaseModel):
    id: UUID
    type: InventoryType


class RunRequest(BaseModel):
    playbookId: UUID
    inventory: list[Inventory]
    forks: int = 1
    extravars: dict[str, str] = {}


async def _run_stream(
    request: Request,
    run_request: RunRequest,
) -> AsyncGenerator[str, None]:
    """Genera el stream SSE de un run una vez resuelta la selección."""
    cookie = request.headers.get("cookie", "")
    if not cookie:
        yield sse({"error": "Missing session cookie"}, event="error")
        return

    inventory_payload = [
        {"id": str(item.id), "type": item.type.value} for item in run_request.inventory
    ]

    try:
        bundle = await resolve_run(
            cookie_header=cookie,
            playbook_id=run_request.playbookId,
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

    materialized = materialize(bundle)
    try:
        extravars = {
            "ansible_user": settings.ansible_user,
            "ansible_become_user": settings.ansible_become_user,
            **run_request.extravars,
        }
        config = AnsibleRunnerConfig(
            playbook=materialized.playbook_path.name,
            private_data_dir=str(materialized.run_dir),
            project_dir=str(materialized.run_dir),
            inventory=materialized.inventory,
            forks=run_request.forks,
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
    summary="Run a playbook against a selection of devices/groups",
    description=(
        "Resolves a playbook + inventory selection via the backend, "
        "materializes the playbook/private keys for ansible-runner, and "
        "streams events over SSE. Events end with a terminal `done` (or "
        "`error` if the run could not start)."
    ),
    response_description="Server-Sent Events stream (`text/event-stream`).",
)
async def run(
    run_request: RunRequest,
    request: Request,
    user: CurrentUser,
) -> StreamingResponse:
    """Resuelve la selección, ejecuta el playbook y streamea eventos SSE."""
    return StreamingResponse(
        _run_stream(request, run_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
