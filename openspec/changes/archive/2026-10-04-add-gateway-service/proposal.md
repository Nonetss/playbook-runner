## Why

Caddy currently lives inside the frontend image (`apps/frontend/Caddyfile` plus a `start.sh` that runs Astro and Caddy in the same container), so the frontend is both an app and the public entry point, and the system's routing map is buried in an image that should know nothing about the backend. The sibling `stack` project already solved this with `apps/gateway`: a standalone Caddy that is the only place deciding which app serves each request, for public HTTP and for internal gRPC alike. Bringing it here separates concerns, slims the frontend image and gives gRPC a single routing point ready for more services. Like in `stack`, `bun run dev` also becomes the Docker-based development environment.

## What Changes

- New `apps/gateway` (Docker assets only, not a Bun workspace): `Caddyfile`, `Dockerfile` (`caddy:2-alpine`) and a dev-only `compose.yml` on the host network.
  - `:80` (overridable through `GATEWAY_HTTP_PORT`) — the public HTTP entry point: `/rpc/*`, `/api/*`, `/scalar*`, `/openapi.json` → backend; everything else → frontend. The only port the stack publishes.
  - `:50050` — internal gRPC router (h2c) routing by proto package: `/run.*` → `ansible:50051`; `GET /health` for the healthcheck; any other service answers `UNIMPLEMENTED` (trailers-only). Never published.
- **BREAKING (deployment)**: the frontend image no longer ships Caddy or `start.sh`; it runs only Astro SSR on `0.0.0.0:4321`, reachable only inside the Docker network (`expose`). Anyone publishing the frontend container directly must publish the gateway instead.
- `compose.yml` and `compose.prod.yml`: new `gateway` service publishing `${GATEWAY_PORT}:80` (falling back to `FRONTEND_PORT` so existing `.env` files keep their port); the frontend stops publishing ports and gets its own healthcheck; the backend's `ANSIBLE_GRPC_TARGET` becomes `gateway:50050`.
- The `ANSIBLE_GRPC_TARGET` default in `@playbook-runner/env/server` changes from `localhost:50051` to `localhost:50050` (the gateway), the same path in dev and Docker.
- New image `ghcr.io/<owner>/playbook-runner-gateway` built by `docker-build.yml` (amd64 + arm64), plus `GATEWAY_IMAGE_TAG` in `.env.example`.
- **BREAKING (dev workflow)**: `bun run dev` starts `compose.dev.yml` (frontend, backend, ansible and gateway with hot reload via `docker compose up --build --watch`, all on the host network, each reading its own `apps/*/.env`). The former `turbo watch dev` moves to `bun run dev:local`; `bun run dev:down` and `bun run gateway` (the gateway alone, to pair with `dev:local`) are added.
- New `apps/frontend/Dockerfile.dev`, `apps/backend/Dockerfile.dev`, `apps/ansible/Dockerfile.dev`.
- Docs (`AGENTS.md`, `README.md`, `.env.example`, frontend comments mentioning Caddy) updated to the new split.

## Capabilities

### New Capabilities
- `gateway`: single public HTTP entry point and internal gRPC router, run as a Docker service independent of the frontend.
- `docker-dev-environment`: `bun run dev` starts the full development environment in Docker with hot reload and the same addresses as native development.

### Modified Capabilities
- `service-health`: the backend also waits for the gateway (its gRPC route to the runner), and the frontend and gateway get their own healthchecks in both compose files.
- `container-hardening`: the backend reaches the runner through the gateway (`gateway:50050`) instead of `ansible:50051`; the runner still publishes no host ports.

## Impact

- **Docker**: `apps/frontend/Dockerfile` (no Caddy), delete `apps/frontend/Caddyfile` and `apps/frontend/start.sh`; `compose.yml`, `compose.prod.yml`; new `compose.dev.yml`, `apps/gateway/*`, `apps/*/Dockerfile.dev`.
- **CI**: `.github/workflows/docker-build.yml` builds and pushes a fourth image.
- **Config**: `packages/env/src/server.ts` (`ANSIBLE_GRPC_TARGET` default), `.env.example` (`GATEWAY_PORT`, `GATEWAY_IMAGE_TAG`), `apps/backend/.env.example`.
- **Root scripts**: `dev`, `dev:local`, `dev:down`, `gateway` in `package.json`.
- **Operators**: deployments using `compose.prod.yml` pull one more image; the public port stays the same.
- No application code (API, frontend pages, runner), proto or database changes. No migrations.
