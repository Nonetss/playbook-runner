## 1. Ansible app: routing & settings

- [x] 1.1 Remove `prefix="/ansible"` from `app.include_router(...)` in `apps/ansible/app/main.py` so health is served at `/api/health`; fix the stale "Current-user route" docstring in `apps/ansible/app/api/routes/health.py`
- [x] 1.2 In `apps/ansible/app/core/config.py`, add `ssh_host_key_policy: Literal["accept-new", "strict", "off"] = "accept-new"` and `state_dir: str = "../../.data/ansible-runner"`; remove `ansible_playbook_path` and `ansible_ssh_key`
- [x] 1.3 Add an `ssh_envvars()` helper (e.g. `app/services/ansible/ssh_policy.py`) that maps the policy to `ANSIBLE_HOST_KEY_CHECKING` + `ANSIBLE_SSH_ARGS` per design D4, keeping the default `-C -o ControlMaster=auto -o ControlPersist=60s` prefix and pointing `UserKnownHostsFile` at `<state_dir>/known_hosts` (`/dev/null` for `off`)
- [x] 1.4 In `apps/ansible/app/services/ansible/runner.py`: make `private_data_dir`/`project_dir` required (no `ansible_playbook_path` default), remove the `ssh_key` field and its `run_kwargs()` branch, and add `envvars=ssh_envvars()` to both kwargs shapes (touch only these lines — `fix-run-lifecycle` edits the same file)
- [x] 1.5 In the FastAPI lifespan, create `state_dir` (`mkdir(parents=True, exist_ok=True)`) and log a warning once when the policy is `off`
- [x] 1.6 Update local `apps/ansible/.env` guidance (README "Environment" section and root `README.md:227`) replacing `ANSIBLE_PLAYBOOK_PATH`/`ANSIBLE_SSH_KEY` with `STATE_DIR` and `SSH_HOST_KEY_POLICY`

## 2. Ansible image

- [x] 2.1 Pin `COPY --from=ghcr.io/astral-sh/uv:0.11.23` in `apps/ansible/Dockerfile`
- [x] 2.2 Remove `ANSIBLE_PLAYBOOK_PATH` and `ANSIBLE_HOST_KEY_CHECKING=False` from the runtime `ENV`; add `STATE_DIR=/app/state`
- [x] 2.3 Create a system user `app` (UID 10001, with home dir for `~/.ansible/cp`), `mkdir -p /app/state && chown app:app /app/state`, and switch to `USER app` before `CMD`
- [x] 2.4 Build the image locally (`docker compose build ansible`) and confirm `docker compose run --rm ansible id -u` is not `0`

## 3. Compose files

- [x] 3.1 `compose.yml` ansible service: replace `ports: ["8000:8000"]` with `expose: ["8000", "50051"]`; remove `ANSIBLE_PLAYBOOK_PATH` env and the `./.data/ansible-runner:/app/playbook` bind mount; add named volume `ansible_state:/app/state` and a top-level `volumes:` entry
- [x] 3.2 Replace the ansible healthcheck in `compose.yml` with a `python3 -c` probe that GETs `http://localhost:8000/api/health` and opens a TCP connection to `localhost:50051` (exit non-zero if either fails)
- [x] 3.3 Apply the same healthcheck (switching `python` → `python3`) and the `ansible_state:/app/state` named volume to `compose.prod.yml`
- [x] 3.4 Add `compose.debug.yml` overlay that only publishes `8000:8000` for `ansible`, with a header comment on how to use it (`docker compose -f compose.yml -f compose.debug.yml up`)
- [x] 3.5 Add `SSH_HOST_KEY_POLICY` (commented, default `accept-new`) to the root `.env.example` used by `compose.prod.yml`

## 4. Verification

- [x] 4.1 `bun run check-types` (BasedPyright for ansible) and `bun run format` pass
- [ ] 4.2 `docker compose up -d --build`: ansible reaches `healthy`, then backend and frontend start; `curl localhost:8000` from the host fails (port not published)
- [x] 4.3 `docker compose exec ansible python3 -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/api/health').read())"` returns `OK`; `/ansible/api/health` returns 404
- [ ] 4.4 Run a ping against a reachable device: first run succeeds and `known_hosts` appears in the `ansible_state` volume; recreate the container and confirm the entry persists
- [x] 4.5 Tamper the stored key line for that host and confirm the next run reports it unreachable (host key mismatch); restore it
- [x] 4.6 Set `SSH_HOST_KEY_POLICY=bogus` and confirm the service refuses to start; set `off` and confirm the startup warning is logged
- [x] 4.7 CI: confirm no workflow change is needed (`.github/workflows/docker-build.yml` already builds/pushes `playbook-runner-ansible`)

## 5. Handoff

- [x] 5.1 Record for `cleanup-conventions-docs` the AGENTS.md facts to update: ansible port internal-only (`compose.debug.yml` to publish), `STATE_DIR` named volume replaces the `.data/ansible-runner` → `/app/playbook` mount in Docker, healthcheck also probes gRPC 50051, CI pushes to GHCR with `GITHUB_TOKEN` (not Gitea/`MY_PASSWORD`)
