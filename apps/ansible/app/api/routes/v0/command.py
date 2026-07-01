"""Endpoint que ejecuta un módulo Ansible ad-hoc (``shell``/``command``).

Flujo:
1. valida sesión (vía ``CurrentUser``);
2. reenvía la cookie al backend ``run.resolveHosts`` para obtener la lista de
   hosts con credenciales (sin playbook);
3. materializa las claves privadas en ficheros ``0600`` por run;
4. invoca ``ansible_runner`` en modo ad-hoc (``host_pattern`` + ``module`` +
   ``module_args``) y opcionalmente con privilege escalation;
5. emite los eventos resultantes vía SSE con un ``done`` terminal (o un
   ``error`` si no se puede iniciar).

Los ficheros materializados se borran siempre en un ``finally``.
"""

from __future__ import annotations

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
    resolve_hosts,
)
from app.services.ansible.events import log_event_handler
from app.services.ansible.materialize import cleanup, materialize_hosts
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig
from app.services.ansible.sse import sse, stream_runner_events

router = APIRouter(prefix="/command", tags=["command"])


class InventoryType(str, Enum):
    GROUP = "group"
    DEVICE = "device"


class Inventory(BaseModel):
    id: str
    type: InventoryType


class CommandModule(str, Enum):
    SHELL = "shell"
    COMMAND = "command"


class CommandRequest(BaseModel):
    inventory: list[Inventory] = Field(min_length=1)
    command: str = Field(min_length=1)
    module: CommandModule = CommandModule.SHELL
    become: bool = False
    forks: int = Field(default=1, ge=1, le=500)


async def _command_stream(
    request: Request,
    cmd_request: CommandRequest,
) -> AsyncGenerator[str, None]:
    """Genera el stream SSE de un comando ad-hoc una vez resuelta la selección."""
    cookie = request.headers.get("cookie", "")
    if not cookie:
        yield sse({"error": "Missing session cookie"}, event="error")
        return

    inventory_payload = [
        {"id": item.id, "type": item.type.value} for item in cmd_request.inventory
    ]

    try:
        hosts = await resolve_hosts(
            cookie_header=cookie,
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

    materialized = materialize_hosts(hosts, label="command")
    try:
        extravars = {
            "ansible_user": settings.ansible_user,
            "ansible_become_user": settings.ansible_become_user,
            "ansible_become": "true" if cmd_request.become else "false",
        }
        config = AnsibleRunnerConfig(
            host_pattern="all",
            module=cmd_request.module.value,
            module_args=cmd_request.command,
            private_data_dir=str(materialized.run_dir),
            project_dir=str(materialized.run_dir),
            inventory=materialized.inventory,
            forks=cmd_request.forks,
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
    summary="Run an ad-hoc Ansible command against a selection of devices/groups",
    description=(
        "Resolves an inventory selection via the backend (no playbook), "
        "materializes the per-host private keys for ansible-runner, and "
        "executes an ad-hoc `shell`/`command` module against the resolved "
        "hosts (with optional `become`). Streams events over SSE; events end "
        "with a terminal `done` (or `error` if the run could not start)."
    ),
    response_description="Server-Sent Events stream (`text/event-stream`).",
)
async def command(
    cmd_request: CommandRequest,
    request: Request,
    user: CurrentUser,
) -> StreamingResponse:
    """Resuelve la selección, ejecuta el comando ad-hoc y streamea eventos SSE."""
    return StreamingResponse(
        _command_stream(request, cmd_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
