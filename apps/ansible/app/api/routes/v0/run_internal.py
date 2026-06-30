"""Endpoint interno que ejecuta un bundle ya resuelto.

A diferencia de ``/run`` (que requiere sesión de usuario y resuelve el bundle
llamando al backend), este endpoint lo usa el *scheduler del backend* para
disparar jobs programados, donde no hay cookie de usuario. El backend:

1. resuelve el bundle (playbook + hosts con credenciales) por su cuenta;
2. hace POST aquí con ese bundle ya resuelto;
3. consume el stream SSE y persiste los eventos en ``job_runs``.

Se protege con un secreto compartido (``settings.internal_token``) en la
cabecera ``X-Internal-Token``: no es un endpoint público.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.ansible.backend_client import ResolvedRunBundle
from app.services.ansible.events import log_event_handler
from app.services.ansible.materialize import cleanup, materialize
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig
from app.services.ansible.sse import sse, stream_runner_events

router = APIRouter(prefix="/run", tags=["run"])


class RunBundleRequest(BaseModel):
    bundle: ResolvedRunBundle
    forks: int = 1
    extravars: dict[str, str] = {}


async def _run_bundle_stream(
    request: RunBundleRequest,
) -> AsyncGenerator[str, None]:
    """Materializa el bundle, lo ejecuta y emite eventos SSE."""
    materialized = materialize(request.bundle)
    try:
        extravars = {
            "ansible_user": settings.ansible_user,
            "ansible_become_user": settings.ansible_become_user,
            **request.extravars,
        }
        config = AnsibleRunnerConfig(
            playbook=materialized.playbook_path.name,
            private_data_dir=str(materialized.run_dir),
            project_dir=str(materialized.run_dir),
            inventory=materialized.inventory,
            forks=request.forks,
            extravars=extravars,
            event_handler=log_event_handler,
        )
        async for chunk in stream_runner_events(AnsibleRunner(config)):
            yield chunk
    finally:
        cleanup(materialized)


@router.post(
    "/internal",
    summary="Run an already-resolved bundle (service-to-service)",
    description=(
        "Executes a pre-resolved playbook bundle without a user session. "
        "Guarded by the `X-Internal-Token` shared secret. Used by the backend "
        "scheduler to run scheduled jobs. Streams events over SSE."
    ),
    response_description="Server-Sent Events stream (`text/event-stream`).",
)
async def run_internal(
    request: RunBundleRequest,
    x_internal_token: str = Header(default=""),
) -> StreamingResponse:
    """Ejecuta un bundle resuelto validando el secreto interno."""
    if not settings.internal_token:
        raise HTTPException(status_code=503, detail="Internal endpoint disabled")
    if x_internal_token != settings.internal_token:
        raise HTTPException(status_code=401, detail="Invalid internal token")

    async def _guarded() -> AsyncGenerator[str, None]:
        try:
            async for chunk in _run_bundle_stream(request):
                yield chunk
        except Exception as exc:  # noqa: BLE001 - reportado vía SSE
            yield sse({"error": str(exc)}, event="error")

    return StreamingResponse(
        _guarded(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
