from fastapi import APIRouter
from fastapi.responses import StreamingResponse

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


def _ssh_host() -> HostVars:
    return {
        "ansible_connection": "ssh",
        "ansible_ssh_private_key_file": settings.ansible_ssh_key,
        "ansible_user": settings.ansible_user,
        "ansible_become_user": settings.ansible_become_user,
    }


_HOSTS: dict[str, HostVars] = {
    "localhost": {"ansible_connection": "local"},
    "172.19.1.36": _ssh_host(),
    "172.19.1.46": _ssh_host(),
}


def _build_config() -> AnsibleRunnerConfig:
    return AnsibleRunnerConfig(
        playbook="ping.yml",
        private_data_dir=settings.ansible_playbook_path,
        project_dir=settings.ansible_playbook_path,
        inventory=Inventory({"all": {"hosts": _HOSTS}}),
        forks=1,
        extravars={
            "ansible_user": settings.ansible_user,
            "ansible_become_user": settings.ansible_become_user,
        },
        event_handler=log_event_handler,
    )


@router.get("")
async def ping() -> StreamingResponse:
    """Ejecuta ping.yml y transmite cada evento del playbook vía SSE."""
    runner = AnsibleRunner(_build_config())
    return StreamingResponse(
        stream_runner_events(runner),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
