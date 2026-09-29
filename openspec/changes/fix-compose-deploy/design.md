## Context

The Ansible runner (`apps/ansible`) is a FastAPI app (HTTP :8000) that starts a gRPC server (:50051) in its lifespan. The backend talks to it only over gRPC. Its HTTP surface is:
- `/api/health`
- the demo `/api/grpc-ping-backend` (removed in `cleanup-conventions-docs`)
- `/docs`, `/openapi.json` and `/scalar`

Current state, verified in the repo:

| Area | Today | Problem |
|---|---|---|
| Route prefix | `app.include_router(routes.router, prefix="/ansible")` in `main.py:55`, on top of the router's own `/api` prefix | Health is actually served at `/ansible/api/health`. `compose.yml:23`, `compose.prod.yml:73`, the `service-health` spec and AGENTS.md all probe `/api/health`, so the healthcheck always fails and the stack never starts. The prefix dates from the archived `/ansible/api/v0/*` SSE endpoints that the frontend proxied. |
| Port exposure | `compose.yml` has `ports: "8000:8000"` | This exposes docs, OpenAPI and the demo route on the host with no auth. `compose.prod.yml` already uses `expose` only. |
| Host keys | The Dockerfile sets `ANSIBLE_HOST_KEY_CHECKING=False`, and local dev leaves it unset (Ansible's default is `True`) | Dev and Docker behave differently, and Docker is open to MITM. |
| State | `ANSIBLE_PLAYBOOK_PATH=/app/playbook` plus the bind mount `./.data/ansible-runner:/app/playbook` | These only feed `AnsibleRunnerConfig` defaults. Every call site overrides `private_data_dir`/`project_dir` with the per-run `materialized.run_dir` under `RUN_SCRATCH_DIR`. `ansible_ssh_key` and `AnsibleRunnerConfig.ssh_key` are never set. |
| Image | `COPY --from=ghcr.io/astral-sh/uv:latest`, runs as root | Builds are not reproducible, and the process has more privilege than it needs. |
| CI | `.github/workflows/docker-build.yml` builds `-backend`, `-ansible` and `-frontend` for amd64 and arm64 on GHCR | Already correct. No change. |

## Goals / Non-Goals

**Goals:**
- Both compose stacks start: the healthcheck probes a path that exists and also proves gRPC is listening.
- The runner is unreachable from the host by default.
- Dev and Docker use the same explicit, secure-by-default SSH host key policy.
- Remove dead configuration and give the persistent directory one clear purpose.
- Non-root container and a pinned build tool.

**Non-Goals:**
- TLS for gRPC or constant-time token comparison. These belong to the security track in `harden-access-control`.
- The `ansible_user` extravar override, cancellation and shutdown grace. These belong to `fix-run-lifecycle`.
- Deleting the `grpc-demo` route and updating AGENTS.md. These belong to `cleanup-conventions-docs`.
- Managing host keys from the UI, such as pre-seeding them per device.

## Decisions

### D1: Drop the `/ansible` prefix instead of changing the probes
Remove `prefix="/ansible"` in `main.py` so health lives at `/api/health`.
- **Why:** The spec, both compose files and AGENTS.md already agree on `/api/health`. Fixing the single outlier is one line; the alternative is editing three probes plus docs. Nothing in the repo calls `/ansible/api/*`: the frontend and backend use gRPC, and the only `/ansible/api/v0` references are in archived changes.
- **Alternative:** Change the probes to `/ansible/api/health`. Rejected because it keeps a meaningless prefix and spreads the fix.

### D2: Healthcheck = HTTP 200 on `/api/health` and a TCP connect to `:50051`
Both probes use the same inline `python3 -c` one-liner, with `urllib` plus `socket.create_connection(("localhost", 50051), 2)`. `compose.prod.yml` currently uses `python`; unify both on `python3`.
- **Why:** The backend's real dependency is gRPC. The lifespan starts gRPC before serving HTTP, but an explicit check keeps that guarantee from depending on implementation details and makes failures visible.
- **Alternative:** The standard `grpc.health.v1` service via `grpcio-health-checking` plus `grpc_health_probe`. Rejected because it adds a dependency and a binary to the image for no benefit over a TCP connect at this scale.

### D3: `expose` only, plus an opt-in `compose.debug.yml`
In `compose.yml`, replace `ports: ["8000:8000"]` with `expose: ["8000", "50051"]`. Add `compose.debug.yml`, which only adds `ports: ["8000:8000"]` to `ansible`.
- **Why not `compose.override.yml`?** Compose loads it automatically, which would silently undo the fix.
- **Note:** Non-Docker local dev (`bun run dev`) runs uvicorn on :8000 directly and is unaffected.

### D4: `SSH_HOST_KEY_POLICY` enforced in the app, not in the image
Add `ssh_host_key_policy: Literal["accept-new", "strict", "off"] = "accept-new"` to `Settings`; pydantic rejects invalid values at startup. A helper `ssh_envvars()` maps each policy to the `envvars` passed to every `ansible_runner.run(...)` through `AnsibleRunnerConfig.run_kwargs()`:

| Policy | `ANSIBLE_HOST_KEY_CHECKING` | Extra `ANSIBLE_SSH_ARGS` options |
|---|---|---|
| `accept-new` | `True` | `-o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=<STATE_DIR>/known_hosts` |
| `strict` | `True` | `-o StrictHostKeyChecking=yes -o UserKnownHostsFile=<STATE_DIR>/known_hosts` |
| `off` | `False` | `-o UserKnownHostsFile=/dev/null` (a warning is logged once in the lifespan) |

`ANSIBLE_SSH_ARGS` keeps Ansible's default `-C -o ControlMaster=auto -o ControlPersist=60s` prefix, because setting the variable replaces the default.

Remove `ANSIBLE_HOST_KEY_CHECKING=False` from the Dockerfile.
- **Why in the app:** One code path gives dev and Docker identical behaviour, and the policy can be tested and logged.
- **Why `accept-new` as default:** It is trust-on-first-use. The fleet has no host key inventory today, so `strict` would break every existing deployment. `accept-new` still catches a changed key, which is the MITM case.
- **Alternative:** Mount a hand-managed `known_hosts` and default to `strict`. Rejected as the default because of the operational burden, but still available as `strict`.

### D5: `STATE_DIR` replaces `ANSIBLE_PLAYBOOK_PATH`
- Add `state_dir: str` with a default of `../../.data/ansible-runner`, resolved relative to `apps/ansible` as in the current local `.env` convention. The lifespan creates it with `mkdir(parents=True, exist_ok=True)`.
- In Docker, set `STATE_DIR=/app/state` and use a named volume `ansible_state:/app/state` in both compose files.
- Remove `ansible_playbook_path` and `ansible_ssh_key` from `Settings`, the `ssh_key` field and branch from `AnsibleRunnerConfig`, and the `ANSIBLE_PLAYBOOK_PATH` defaults. `private_data_dir` and `project_dir` become required fields, since every caller already passes them.
- **Why a named volume instead of the `.data/` bind mount:** A named volume starts with the image directory's ownership, so the non-root user (D6) can write to it with no host `chown` step. A bind mount would be owned by the host UID.
- **Local dev keeps `.data/ansible-runner/`,** consistent with AGENTS.md's rule that mutable runner state never lives inside `apps/ansible/`.

### D6: Non-root user and pinned uv
- In the runtime stage, `useradd --system --uid 10001 --create-home app`.
- Create `/app/state` owned by `app`, with no `mkdir` needed for `/tmp/ansible-runs`, since `/tmp` is world-writable and the app creates the directory.
- Then `USER app`.
- A home directory is required because Ansible's SSH `ControlPath` defaults to `~/.ansible/cp`.
- Pin `COPY --from=ghcr.io/astral-sh/uv:0.11.23`, matching the uv version currently used locally.

## Risks / Trade-offs

- **[Risk] A host's key legitimately changes (for example after a reinstall), and its runs fail under `accept-new`.**
  **Mitigation:** Document removing the line from `known_hosts` in the volume, or temporarily setting `off`. This failure is the intended security behaviour.
- **[Risk] Existing Docker users lose the `.data/ansible-runner` mount.**
  **Mitigation:** Nothing important lived there, since runs always used `/tmp/ansible-runs`. Mention it in the release notes.
- **[Risk] `accept-new` requires OpenSSH ≥ 7.6.**
  **Mitigation:** `python:3.12-slim` (Debian bookworm) ships OpenSSH 9.x. Check the local version with `ssh -V`.
- **[Risk] `runner.py` is also edited by `fix-run-lifecycle`.**
  **Mitigation:** Only touch `run_kwargs()` (adding `envvars`) and the field defaults here. Rebase whichever change lands second.
- **[Trade-off]** The TCP probe proves the port is listening, not that the service token matches. A token mismatch still shows up as backend errors at run time.

## Migration Plan

1. Deploy the new images and compose files. Compose creates the `ansible_state` volume automatically.
2. The first run against each host populates `known_hosts` (`accept-new`).
3. **Rollback:** Set `SSH_HOST_KEY_POLICY=off` to get the old behaviour without redeploying an older image. Or roll back the images; the old `/ansible` prefix plus the old healthcheck never worked anyway.

## Open Questions

- Should `/docs`, `/openapi.json` and `/scalar` be disabled when `ENVIRONMENT=production`? Now that the port is internal they are low risk, so this is left out of scope.
