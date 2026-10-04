## 1. Gateway service

- [x] 1.1 Create `apps/gateway/Caddyfile` per design §2 (HTTP site on `{$GATEWAY_HTTP_PORT:80}` with backend/frontend routes and `encode zstd gzip`; gRPC site `:50050` with `/health`, `@ansible path /run.*` → `h2c://{$ANSIBLE_GRPC_UPSTREAM:ansible:50051}` with `flush_interval -1`, and the trailers-only `UNIMPLEMENTED` fallback; header comments explaining the routing rule) and verify with `docker run --rm -v $PWD/apps/gateway/Caddyfile:/etc/caddy/Caddyfile caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`
- [x] 1.2 Create `apps/gateway/Dockerfile` (`caddy:2-alpine`, copy the Caddyfile, `EXPOSE 80 50050`, `caddy run` CMD) and verify `docker build -f apps/gateway/Dockerfile .` succeeds
- [x] 1.3 Create `apps/gateway/compose.yml` (dev-only, project `playbook-runner-gateway-dev`, `network_mode: host`, `GATEWAY_HTTP_PORT=8080`, upstreams on `localhost:3000`/`localhost:4321`/`localhost:50051`) and verify `docker compose -f apps/gateway/compose.yml config` succeeds

## 2. Frontend image without Caddy

- [x] 2.1 Update `apps/frontend/Dockerfile` runtime stage: drop the Caddy binary, Caddyfile and `start.sh` copies; `HOST=0.0.0.0`, `PORT=4321`, `EXPOSE 4321`, `CMD ["node", "/app/apps/frontend/dist/server/entry.mjs"]`, keep `USER node`; verify `docker build -f apps/frontend/Dockerfile .` succeeds and the image has no `caddy` binary
- [x] 2.2 Delete `apps/frontend/Caddyfile` and `apps/frontend/start.sh`, and update the Caddy mentions in `apps/frontend/src/middleware.ts` and `apps/frontend/src/lib/orpc.ts` comments to "gateway (Docker) / Vite (dev)"; verify `grep -rni caddy apps/frontend` returns nothing and `bun run check` passes

## 3. Backend gRPC target

- [x] 3.1 Change the `ANSIBLE_GRPC_TARGET` default in `packages/env/src/server.ts` to `localhost:50050` and document in `apps/backend/.env.example` that it points at the gateway (set `localhost:50051` to skip it in native dev); verify `bun run check-types` passes

## 4. Compose (default and production)

- [x] 4.1 Update `compose.yml`: add `gateway` (build, `ports: "${GATEWAY_PORT:-${FRONTEND_PORT:-4321}}:80"`, `expose: 50050`, `wget` healthcheck on `:50050/health`, no `depends_on`); frontend → `expose: 4321`, no `ports`, Node `fetch('http://localhost:4321/login')` healthcheck; backend → `ANSIBLE_GRPC_TARGET: gateway:50050`, `depends_on` gateway + ansible healthy; verify `docker compose config` succeeds
- [x] 4.2 Apply the same changes to `compose.prod.yml` with `image: ghcr.io/nonetss/playbook-runner-gateway:${GATEWAY_IMAGE_TAG:-latest}`, `pull_policy: always`, and update its header comment (only the gateway publishes a port); verify `docker compose -f compose.prod.yml --env-file .env.example config` succeeds and shows the gateway on `4321:80`
- [x] 4.3 Update `.env.example`: add `GATEWAY_IMAGE_TAG` and `GATEWAY_PORT` (with `FRONTEND_PORT` noted as legacy fallback), fix the "Caddy → Astro SSR" comment; verify by reading the rendered `docker compose -f compose.prod.yml --env-file .env.example config`

## 5. Docker dev environment

- [x] 5.1 Create `apps/backend/Dockerfile.dev` and `apps/frontend/Dockerfile.dev` per design §8 (`oven/bun:1.3.14-slim`, manifest-first install of every workspace `package.json`, `COPY . .`, backend generates gRPC stubs; `bun run --hot src/index.ts` / `bun run dev --port 4321`); verify both build with `docker build -f apps/<app>/Dockerfile.dev .`
- [x] 5.2 Create `apps/ansible/Dockerfile.dev` per design §8 (`python:3.12-slim` + pinned `uv`, `openssh-client git ca-certificates`, `uv sync --frozen` with dev deps, stubs generated into `app/grpc/gen`, `fastapi dev app/main.py --host 0.0.0.0 --port 8000`); verify it builds and `docker run --rm <image> python -c "import app.grpc.gen.run_pb2"` succeeds
- [x] 5.3 Create `compose.dev.yml` (project `playbook-runner-dev`) with frontend, backend, ansible and gateway on `network_mode: host`, `env_file` per app, the `develop.watch` rules from design §7–§8, and the `ansible_dev_state` volume at `/app/.data/ansible-runner`; verify `docker compose -f compose.dev.yml config` succeeds
- [x] 5.4 Fix `.dockerignore` (`docker-compose.yml` → `compose*.yml`) and verify the prod and dev images still build
- [ ] 5.5 Update root `package.json` scripts: `dev` → `docker compose -f compose.dev.yml up --build --watch`, add `dev:local` (`turbo watch dev`), `dev:down`, `gateway`; verify `bun run dev:local` still starts the native stack

## 6. CI

- [x] 6.1 Add `gateway` (`apps/gateway/Dockerfile`, suffix `-gateway`) to the `build` matrix (amd64 + arm64) and the `merge` matrix in `.github/workflows/docker-build.yml`; verify the YAML parses (`python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/docker-build.yml'))"`) and lists four images in both matrices

## 7. Documentation

- [x] 7.1 Update `AGENTS.md`: add `apps/gateway` to workspaces/entrypoints, rewrite the Docker section (gateway is the only published port, frontend runs Astro only on `:4321` with its own healthcheck, backend → `gateway:50050`, a new proto package needs a gateway route, add-a-workspace note unchanged), the commands section (`dev` = Docker dev, `dev:local`, `dev:down`, `gateway`), and the `ANSIBLE_GRPC_TARGET` default; verify `grep -n -i caddy AGENTS.md` only refers to the gateway
- [x] 7.2 Update `README.md` (stack list, local dev quick start with `bun run dev` vs `bun run dev:local`, production upgrade note about the gateway image) and verify the commands it shows match `package.json`
- [x] 7.3 Update `img/architecture.html` and `img/architecture.svg`, which today show "Caddy reverse proxy" inside the frontend box: draw the gateway as its own box in front of frontend and backend, with the backend → gateway → ansible gRPC hop; verify by opening the HTML and checking the SVG matches it

## 8. End-to-end verification

- [x] 8.1 `docker compose up --build`: all four app services become healthy (`docker compose ps`), `http://localhost:4321/login` renders, `GET /api/v1/health/check` and `/scalar` answer through the gateway, and `docker compose port frontend 4321` / `docker compose port ansible 8000` publish nothing
- [ ] 8.2 Through the Docker stack, run a ping and a playbook from the UI: output streams live; close the run console mid-run and confirm the runner logs the cancellation and deletes the run's key files
- [x] 8.3 From inside the backend container, call a non-routed gRPC path on `gateway:50050` (e.g. `/foo.Bar/Baz`) and confirm `UNIMPLEMENTED`
- [ ] 8.4 `bun run dev` with a local PostgreSQL: app on `http://localhost:4321` and `http://localhost:8080`, admin sign-in works, editing `apps/frontend/src`, `packages/api/src` and `apps/ansible/app` hot-reloads each service; `bun run dev:down` removes the containers
- [ ] 8.5 Run `bun run check`, `bun run check-types` and `bun run test:e2e` against the Docker dev stack and confirm they pass
