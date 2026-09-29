from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    log_level: str = "info"
    ansible_user: str = "ansible"
    ansible_become_user: str = "root"

    run_scratch_dir: str = "/tmp/ansible-runs"
    # State that must outlive a single run (currently ``known_hosts``).
    # Relative to apps/ansible in local dev; a named volume in Docker.
    state_dir: str = "../../.data/ansible-runner"
    # SSH host key verification applied to every run. ``accept-new`` trusts a
    # host on first contact and rejects changed keys afterwards.
    ssh_host_key_policy: Literal["accept-new", "strict", "off"] = "accept-new"
    # Upper bound on concurrent ansible-runner processes (runs, commands,
    # scripts and pings). Extra requests fail fast with RESOURCE_EXHAUSTED.
    max_concurrent_runs: int = Field(default=8, ge=1)
    # Seconds in-flight RPCs get to cancel and clean up on shutdown. Keep it
    # below Docker's 10 s stop timeout.
    grpc_shutdown_grace_s: float = Field(default=8, gt=0)

    # Git playbook repositories: mirrors live in ``STATE_DIR/repos``. Each git
    # command is bounded by ``git_timeout_s``; a mirror larger than
    # ``git_max_repo_mb`` is dropped and the sync fails. Syncs have their own
    # small admission limit, separate from ``max_concurrent_runs``.
    git_timeout_s: float = Field(default=120, gt=0)
    git_max_repo_mb: int = Field(default=512, ge=1)
    max_concurrent_syncs: int = Field(default=2, ge=1)

    # Shared secret guarding gRPC in both directions (backend <-> ansible).
    # Must match the backend's SERVICE_TOKEN. When empty the gRPC server here
    # still starts (grpc.aio has no "don't start" mode), but every call is
    # rejected since no token will ever match "".
    service_token: str = ""


settings = Settings()
