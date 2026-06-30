from __future__ import annotations

import shutil
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.core.config import settings
from app.services.ansible.events import log_event_handler
from app.services.ansible.runner import (
    AnsibleRunner,
    AnsibleRunnerConfig,
    HostVars,
    Inventory,
)
from app.services.ansible.sse import stream_runner_events

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
    host: str


def _strip_cidr(host: str) -> str:
    return host.split("/")[0]


async def _ping_stream(host: str) -> AsyncGenerator[str, None]:
    ip = _strip_cidr(host)

    scratch = Path(settings.run_scratch_dir)
    scratch.mkdir(parents=True, exist_ok=True)
    run_dir = scratch / f"ping-{uuid.uuid4().hex[:12]}"
    run_dir.mkdir()

    playbook_path = run_dir / "ping.yml"
    playbook_path.write_text(_PING_PLAYBOOK, encoding="utf-8")

    host_vars: HostVars = {
        "ansible_connection": "ssh",
        "ansible_host": ip,
        "ansible_ssh_private_key_file": settings.ansible_ssh_key,
        "ansible_user": settings.ansible_user,
        "ansible_become_user": settings.ansible_become_user,
    }
    config = AnsibleRunnerConfig(
        playbook="ping.yml",
        private_data_dir=str(run_dir),
        project_dir=str(run_dir),
        inventory=Inventory({"all": {"hosts": {ip: host_vars}}}),
        forks=1,
        extravars={
            "ansible_user": settings.ansible_user,
            "ansible_become_user": settings.ansible_become_user,
        },
        event_handler=log_event_handler,
    )

    try:
        async for chunk in stream_runner_events(AnsibleRunner(config)):
            yield chunk
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)


@router.post(
    "",
    summary="Ping a host via Ansible",
    description="Writes ping.yml to a temp directory, executes it against a single host, and streams events over SSE.",
    response_description="Server-Sent Events stream (`text/event-stream`).",
)
async def ping(ping_request: PingRequest, user: CurrentUser) -> StreamingResponse:
    """Hace ping a un host y transmite los eventos vía SSE."""
    return StreamingResponse(
        _ping_stream(ping_request.host),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
