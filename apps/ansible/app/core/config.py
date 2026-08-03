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
    ansible_playbook_path: str = ""
    ansible_user: str = "ansible"
    ansible_become_user: str = "root"
    ansible_ssh_key: str = ""

    run_scratch_dir: str = "/tmp/ansible-runs"

    # Shared secret guarding gRPC in both directions (backend <-> ansible).
    # Must match the backend's SERVICE_TOKEN. When empty the gRPC server here
    # still starts (grpc.aio has no "don't start" mode), but every call is
    # rejected since no token will ever match "".
    service_token: str = ""
    # gRPC target for the backend's PingService, dialled from this service.
    backend_grpc_target: str = "localhost:50052"


settings = Settings()
