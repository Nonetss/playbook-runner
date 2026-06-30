from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    backend_url: str = "http://localhost:3000"
    ansible_playbook_path: str = ""
    ansible_user: str = "ansible"
    ansible_become_user: str = "root"
    ansible_ssh_key: str = ""

    run_scratch_dir: str = "/tmp/ansible-runs"
    backend_resolve_path: str = "/api/run/resolve"

    # Shared secret guarding the internal run endpoint used by the backend
    # scheduler (service-to-service, no user session). Must match the backend's
    # INTERNAL_TOKEN. When empty the internal endpoint is disabled.
    internal_token: str = ""


settings = Settings()
