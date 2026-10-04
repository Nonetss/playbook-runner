## Context

See proposal.md for motivation. Current state:

- `apps/frontend/Dockerfile` copies the Caddy binary into a `node:24-slim` runtime; `start.sh` backgrounds Astro SSR on `127.0.0.1:4321` and `exec`s Caddy on `:80`. The Caddyfile routes `/rpc/*`, `/api/*`, `/scalar*`, `/openapi.json` to `${BACKEND_UPSTREAM:backend:3000}` and the rest to Astro. Compose publishes `4321:80` on the frontend; there is no frontend healthcheck.
- gRPC: one client (backend, `@grpc/grpc-js` with insecure credentials, `ANSIBLE_GRPC_TARGET`, default `localhost:50051`) and one server (Ansible, `package run; service RunnerService`, port 50051, mostly server-streaming RPCs, token checked by the `grpc-toolkit` interceptor on `authorization` metadata). Closing a stream cancels the call and the runner kills Ansible.
- Dev today is native: `bun run dev` = `turbo watch dev` (frontend `astro dev` :4321 with a Vite proxy to :3000, backend `bun --hot` :3000, Ansible `uv run fastapi dev` :8000 + gRPC :50051). PostgreSQL runs outside (README suggests a `docker run`).
- Reference implementation: `/home/nonete/code/stack/apps/gateway` (`Caddyfile`, `Dockerfile`, `compose.yml`), `stack/compose.dev.yml` and `stack/apps/*/Dockerfile.dev`.

## Goals / Non-Goals

**Goals:**
- Port `stack`'s gateway with the same shape and conventions, adapted to this repo's services (backend, frontend, ansible) and proto package (`run`).
- Frontend image runs only Astro.
- `bun run dev` = Docker dev stack with watch, same addresses as native dev.

**Non-Goals:**
- TLS termination or automatic HTTPS in the gateway (stays `auto_https off`; TLS is the operator's reverse proxy/LB job, as today).
- A PostgreSQL service in `compose.dev.yml` (developers keep their own DB on `localhost:5432`, as in `stack`).
- Exposing the backend as a gRPC server, renaming `ANSIBLE_GRPC_TARGET`, or touching proto/app code.
- Moving the frontend runtime from Node to Bun (`stack` did; unrelated to this change).
- Making the gateway a Bun workspace (it has no `package.json`, so no Dockerfile `COPY` lines are needed for it).

## Decisions

1. **Gateway is Docker assets only (`apps/gateway/{Caddyfile,Dockerfile,compose.yml}`).** Same as `stack`. Dockerfile is `FROM caddy:2-alpine`, copies the Caddyfile, `EXPOSE 80 50050`. Build context stays the repo root (`COPY apps/gateway/Caddyfile …`) so CI keeps the uniform `docker buildx build . -f apps/<name>/Dockerfile` invocation. The root `.dockerignore` excludes `**/Dockerfile` from the context, which is harmless here.

2. **Caddyfile, adapted from `stack`:**
   - Global: `admin off`, `auto_https off`, `servers { protocols h1 h2c }` (h2c is required so grpc-js' cleartext HTTP/2 is accepted).
   - `(grpc_upstream)` snippet: `reverse_proxy h2c://{args[0]} { flush_interval -1 }` — `flush_interval -1` is what makes `RunBundle`/`RunCommand`/… events stream through immediately.
   - `:{$GATEWAY_HTTP_PORT:80}`: `encode zstd gzip`; `@backend path /rpc/* /api/* /scalar* /openapi.json` → `{$BACKEND_HTTP_UPSTREAM:backend:3000}`; fallback → `{$FRONTEND_HTTP_UPSTREAM:frontend:4321}`.
   - `:50050`: `handle /health { respond "ok" 200 }`; `@ansible path /run.*` → `import grpc_upstream {$ANSIBLE_GRPC_UPSTREAM:ansible:50051}`; fallback trailers-only `UNIMPLEMENTED` (`Content-Type: application/grpc`, `Grpc-Status 12`, `Grpc-Message "no route for this gRPC service"`, `respond 200`).
   - The route key is the proto package (`run`), not the service name, matching `stack`'s rule "one route per package; no package served by two apps". A comment states that a new proto package declaring a service needs a route here.
   - *Alternative considered:* keep backend → `ansible:50051` direct and only bring the HTTP half (user chose HTTP + gRPC router). *Alternative:* `encode` on the gRPC site — rejected, gRPC has its own framing/compression.

3. **Encoding vs. event streams.** `encode zstd gzip` is already applied by today's Caddy in front of `/rpc/*`, including the oRPC event-stream runs; behaviour is unchanged by moving it. Keep it identical to avoid introducing a regression in a refactor.

4. **Frontend runtime image.** Drop the Caddy `COPY`, the Caddyfile, `start.sh`; set `HOST=0.0.0.0`, `PORT=4321`, `EXPOSE 4321`, `CMD ["node", "/app/apps/frontend/dist/server/entry.mjs"]`, keep `USER node`. Healthcheck uses Node (`node -e "fetch('http://localhost:4321/login')…"`), since the runtime has Node and no Bun. `/login` is a public path in the middleware, so it returns 200 without a session.

5. **Compose topology (both files).**
   - `gateway`: `ports: "${GATEWAY_PORT:-${FRONTEND_PORT:-4321}}:80"`, `expose: ["50050"]`, healthcheck `wget -q --spider http://localhost:50050/health` (busybox `wget` exists in `caddy:2-alpine`), `restart: unless-stopped`, **no `depends_on`** — it must be healthy before the backend, and Caddy simply returns 502 until an HTTP upstream is up.
   - `backend`: `ANSIBLE_GRPC_TARGET: gateway:50050`, `depends_on: { ansible: healthy, gateway: healthy }` (+ `postgres` in prod).
   - `frontend`: `expose: ["4321"]`, no `ports`, healthcheck as in 4, `depends_on: backend healthy` (unchanged).
   - In `compose.yml` the gateway uses `build:`; in `compose.prod.yml` it uses `image: ghcr.io/nonetss/playbook-runner-gateway:${GATEWAY_IMAGE_TAG:-latest}` with `pull_policy: always`, like the others.
   - `CORS_ORIGIN`/`BETTER_AUTH_URL` values do not change: the public origin is still `http://localhost:4321` (same port, now owned by the gateway).
   - *Nested default* `${GATEWAY_PORT:-${FRONTEND_PORT:-4321}}` is supported by Compose v2's interpolation; it keeps existing prod `.env` files working without edits. `.env.example` documents `GATEWAY_PORT` and marks `FRONTEND_PORT` as a legacy fallback.

6. **`ANSIBLE_GRPC_TARGET` default → `localhost:50050`.** One path everywhere (Docker, Docker dev, native + `bun run gateway`), like `stack`'s single `GRPC_TARGET`. Native dev without the gateway still works by setting `ANSIBLE_GRPC_TARGET=localhost:50051` in `apps/backend/.env`; `apps/backend/.env.example` documents both. *Alternative:* keep `50051` as default and only override in compose — rejected, it makes the dev gateway pointless for gRPC and diverges from production.

7. **Docker dev stack (`compose.dev.yml`, project name `playbook-runner-dev`).** Mirrors `stack/compose.dev.yml`:
   - All services `network_mode: host`, `init: true`, `env_file: apps/<app>/.env (required: false)`. Host network gives exact parity with native addresses (`localhost:5432`, `:3000`, `:4321`, `:50050`, `:50051`) and lets the Vite proxy in `astro.config.mjs` keep pointing at `localhost:3000` unchanged.
   - `develop.watch` (`docker compose up --build --watch`): `sync` for app `src` and shared `packages/*/src` (ignoring `node_modules/`, `dist/`, `.astro/`, `.turbo/`, `gen/`), `sync+restart` for `astro.config.mjs`, `rebuild` for `bun.lock`, `package.json`s, `proto/`, `pyproject.toml`/`uv.lock`. No bind mounts: `node_modules`, `.venv` and generated stubs stay the container's own.
   - `gateway` service: same image, `GATEWAY_HTTP_PORT=8080`, upstreams `localhost:3000`/`localhost:4321`/`localhost:50051`, `sync+restart` on the Caddyfile → `/etc/caddy/Caddyfile`. `apps/gateway/compose.yml` (for `bun run gateway`) is the same service standalone, project name `playbook-runner-gateway-dev`.
   - Root scripts: `dev` → `docker compose -f compose.dev.yml up --build --watch`, `dev:down` → `docker compose -f compose.dev.yml down`, `dev:local` → `turbo watch dev`, `gateway` → `docker compose -f apps/gateway/compose.yml up --build`. `dev:frontend`/`dev:backend` stay as native Turbo scopes.

8. **Dev Dockerfiles.**
   - `apps/frontend/Dockerfile.dev`, `apps/backend/Dockerfile.dev`: `oven/bun:1.3.14-slim` (keep in sync with `packageManager`), same manifest-first `bun install --frozen-lockfile` layer as the prod Dockerfiles (every workspace `package.json`), then `COPY . .`. Backend runs `cd packages/grpc && bun run generate-grpc` (stubs are gitignored) and `CMD ["bun", "run", "--hot", "src/index.ts"]` from `apps/backend`. Frontend `CMD ["bun", "run", "dev", "--port", "4321"]` from `apps/frontend` (`astro dev`).
   - Frontend dev under Bun: `astro dev` already runs under Bun natively via `bun run dev`; if a Node-only dev dependency breaks, fall back to `node:24-slim` + copied Bun binary, as the prod build stage does.
   - `apps/ansible/Dockerfile.dev`: `python:3.12-slim` + pinned `uv` (same tag as prod), `openssh-client`, `git`, `ca-certificates`; `WORKDIR /app/apps/ansible` mirroring the monorepo so the `../../python/grpc-toolkit` path dependency resolves; `uv sync --frozen` **with** dev deps (needed for `grpcio-tools` codegen and `fastapi dev`), stubs generated into `app/grpc/gen` with the same `protoc` call as prod; `CMD ["fastapi", "dev", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]`. Runs as root (dev only; avoids volume ownership friction).
   - State: the default `STATE_DIR` (`../../.data/ansible-runner` → `/app/.data/ansible-runner`) is backed by a named volume `ansible_dev_state`, satisfying the persistence requirement without bind-mounting the repo's `.data/`. *Alternative:* bind-mount `.data/` to share state with native dev — rejected to keep the no-bind-mount rule and avoid UID mismatch on host files.
   - Watch for Ansible: `sync` `apps/ansible/app` (ignore `.venv/`, `__pycache__/`, `.ruff_cache/`, `gen/`), `sync+restart` `python/` (editable toolkit, not under `fastapi dev`'s watch root), `rebuild` on `proto/`, `pyproject.toml`, `uv.lock`.
   - The `.dockerignore` already excludes `**/.env`, `**/.venv`, `**/node_modules`, `.data/`; it also excludes `**/Dockerfile` but not `Dockerfile.dev` (harmless). Its `docker-compose.yml` line is stale (the file is `compose.yml`); fix it to `compose*.yml` while touching it.

9. **CI.** Add `gateway` (`apps/gateway/Dockerfile`, suffix `-gateway`) to both the `build` matrix (amd64, arm64) and the `merge` matrix of `docker-build.yml`. No path filtering (the workflow builds everything today; keep it).

## Risks / Trade-offs

- [Extra hop on every gRPC call and stream] → Caddy h2c proxying is cheap; `flush_interval -1` keeps streaming latency equivalent. Verified manually in tasks by running a ping and a playbook through the gateway.
- [Cancellation through the proxy] → Caddy cancels the upstream request when the downstream stream is reset; verified in tasks by closing the run console mid-run and checking the runner logs a cancel and cleans up the run's key files.
- [gRPC deadlines/long runs cut by proxy timeouts] → Caddy's `reverse_proxy` has no default response timeout; do not add one. Long playbooks keep streaming.
- [Gateway down = no runs and no UI] → it is a single, stateless container with a healthcheck and `restart: unless-stopped`; same blast radius as today's frontend-embedded Caddy for HTTP.
- [Operators upgrading `compose.prod.yml`] → port interpolation falls back to `FRONTEND_PORT`; release notes/README mention the new image and that the frontend no longer publishes a port.
- [`bun run dev` now needs Docker; host network is Linux-only in practice] → `bun run dev:local` keeps the native flow; README documents both. Docker Desktop (macOS/Windows) host networking is opt-in and not a target here.
- [Docker dev and native dev share ports] → documented: run one or the other.
- [Playwright E2E] → reuses whatever serves `:4321`, so it works with either `bun run dev` or `bun run dev:local`; no config change.

## Migration Plan

1. Merge; CI publishes `playbook-runner-gateway` alongside the other images.
2. Operators: `docker compose -f compose.prod.yml pull && docker compose -f compose.prod.yml up -d`. The frontend container is recreated without a published port and the gateway takes over the same host port. Optionally rename `FRONTEND_PORT` → `GATEWAY_PORT` in `.env`.
3. Developers: `bun run dev` now starts Docker; use `bun run dev:local` for the old behaviour (with `bun run gateway`, or `ANSIBLE_GRPC_TARGET=localhost:50051`).

Rollback: redeploy the previous image tags with the previous `compose.prod.yml`; there is no data or schema change.
