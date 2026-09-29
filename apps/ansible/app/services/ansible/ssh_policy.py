"""SSH host key verification policy applied to every ansible-runner call."""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings

# Setting ANSIBLE_SSH_ARGS replaces Ansible's default, so keep its prefix.
_DEFAULT_SSH_ARGS = "-C -o ControlMaster=auto -o ControlPersist=60s"


def known_hosts_path() -> Path:
    return Path(settings.state_dir).resolve() / "known_hosts"


def ssh_envvars() -> dict[str, str]:
    """Map ``SSH_HOST_KEY_POLICY`` to ansible-runner ``envvars``."""
    policy = settings.ssh_host_key_policy
    if policy == "off":
        return {
            "ANSIBLE_HOST_KEY_CHECKING": "False",
            "ANSIBLE_SSH_ARGS": f"{_DEFAULT_SSH_ARGS} -o UserKnownHostsFile=/dev/null",
        }
    strict = "accept-new" if policy == "accept-new" else "yes"
    return {
        "ANSIBLE_HOST_KEY_CHECKING": "True",
        "ANSIBLE_SSH_ARGS": (
            f"{_DEFAULT_SSH_ARGS} -o StrictHostKeyChecking={strict}"
            f" -o UserKnownHostsFile={known_hosts_path()}"
        ),
    }
