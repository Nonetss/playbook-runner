## Why

The local Docker Compose stack cannot start. The Ansible healthcheck probes `GET /api/health`, but FastAPI mounts every route under a leftover `/ansible` prefix (`apps/ansible/app/main.py:55`), so the probe always gets a 404. The backend waits on `ansible: service_healthy`, and the frontend waits on the backend, so neither ever starts. `compose.prod.yml` uses the same probe and has the same problem.

The Ansible container also has several weaknesses:
- `compose.yml` publishes port 8000 to the host with no authentication.
- SSH host key checking is turned off only inside Docker (`ANSIBLE_HOST_KEY_CHECKING=False`), so dev and Docker behave differently and every SSH connection is open to MITM.
- The container runs as root.
- The build pulls an unpinned `uv:latest`.
- The `.data/ansible-runner` bind mount and the `ANSIBLE_PLAYBOOK_PATH` / `ANSIBLE_SSH_KEY` settings are no longer used.

## What Changes

- Remove the legacy `/ansible` route prefix so the health endpoint is served at `/api/health`, the path both compose files and the `service-health` spec already expect. It dates from the removed `/ansible/api/v0/*` SSE endpoints. **BREAKING** for anyone calling `/ansible/api/*` directly; no code in the repo does.
- The Ansible healthcheck also confirms the gRPC port (50051) accepts connections, so "healthy" means the backend can actually reach the runner.
- `compose.yml` stops publishing port 8000 and only `expose`s it on the compose network, matching `compose.prod.yml`. A new opt-in `compose.debug.yml` overlay republishes it for local debugging.
- Replace the hardcoded `ANSIBLE_HOST_KEY_CHECKING=False` with an explicit `SSH_HOST_KEY_POLICY` setting (`accept-new` default | `strict` | `off`). The service applies it to every run in both dev and Docker, with `known_hosts` kept in a persistent state directory. **BREAKING** only for hosts whose key changed since first contact; `off` restores the old behaviour.
- Replace the unused `ANSIBLE_PLAYBOOK_PATH` / `.data/ansible-runner` → `/app/playbook` mount with a `STATE_DIR` setting, which holds `known_hosts`. Docker backs it with a named volume and local dev uses `.data/ansible-runner`. Remove the dead `ansible_playbook_path`, `ansible_ssh_key` and `AnsibleRunnerConfig.ssh_key` settings.
- Harden the Ansible image: pin the `uv` image tag, run as a dedicated non-root user, and make the state and scratch directories writable by that user.
- CI: no change needed. `.github/workflows/docker-build.yml` already builds and pushes the `-ansible` image for amd64 and arm64.

## Capabilities

### New Capabilities
- `container-hardening`: how the runner container is exposed and run. It covers internal-only ports, a non-root runtime, pinned build tooling, and a configurable SSH host key verification policy with a persistent `known_hosts`.

### Modified Capabilities
- `service-health`: Ansible readiness also requires the gRPC port to accept connections, and the probe path is `/api/health` with no prefix, in both compose files.

## Impact

- **Code:**
  - `apps/ansible/app/main.py`: route prefix.
  - `apps/ansible/app/core/config.py`: new `ssh_host_key_policy` and `state_dir`; remove dead settings.
  - `apps/ansible/app/services/ansible/runner.py`: pass `envvars` for host key checking; drop the `ssh_key` field and the `ansible_playbook_path` defaults.
  - `apps/ansible/app/api/routes/health.py`: docstring.
- **Deploy:** `apps/ansible/Dockerfile`, `compose.yml`, `compose.prod.yml`, new `compose.debug.yml`, and `apps/ansible/.env` keys (the committed example / README).
- **Docs:** `AGENTS.md` needs updating for the port, the state dir, the healthcheck and the fact that CI targets GHCR, not Gitea. That update is tracked in `cleanup-conventions-docs`, and this change only lists the facts.
- **Coordination:** `fix-run-lifecycle` also edits `runner.py` (`ansible_user` extravar, cancellation), and `cleanup-conventions-docs` removes the `grpc-demo` route. Keep these edits minimal to avoid conflicts.
- **No DB schema or migration changes.**
