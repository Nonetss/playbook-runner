## Why

The code no longer matches the conventions in `AGENTS.md`, and AGENTS.md no longer describes the code. Most `packages/api` handlers take positional arguments, schemas and business logic live in `router.ts`, and several `input.ts` files are duplicated in the routers. Demo scaffolding is still reachable in production (`grpcDemo`, `private`, the backend `PingService` gRPC server, and the Ansible `/grpc-ping-backend` route), and there is a fair amount of dead code in all three apps. This change comes last in the audit series. It restores one consistent shape so that later work (and agents following AGENTS.md) produce code that fits.

## What Changes

- **API layering:** every procedure-backing handler method takes `({ context, input })`.
  - Output schemas move to `<feature>/output.ts`.
  - Routers use their feature's `input.ts` instead of redefining schemas inline.
  - Business logic moves out of `router.ts`: the credentials `generate` call and the playbooks `handleFolderError` mapping.
  - Non-procedure helpers (host/run resolution, scheduled-job listing) move into feature helper modules.
- **BREAKING (API key routes):** the API key feature is mounted at `v1.apiKeys` (`/rpc/v1/apiKeys/*`, `/api/v1/apiKeys/*`) instead of `v1.config.apiKeys`. The exports are renamed from `configHandler` to `apiKeyHandler` and from `apiKeyRouter` to `apiKeysRouter`. Frontend callers are updated in the same change, but external API consumers must update their paths.
- **Input validation and not-found errors:** ID inputs are validated as UUIDs and malformed IDs are rejected with `BAD_REQUEST`. `get`/`update`/`delete` on a missing row throw `NOT_FOUND` instead of returning `null` or failing inside Postgres.
- **`updatedAt`:** updates set `updatedAt` and never write `id` through `.set()`.
- **BREAKING (demo endpoints):** remove `v1.private.data` and `v1.grpcDemo.ping`.
- **Demo gRPC path:** remove the backend gRPC server, which exists only to host `PingService`. Also remove `proto/ping.proto`, the Ansible `PingServicer`, the `GET /ansible/api/grpc-ping-backend` route, the backend gRPC channel from Ansible, and the `BACKEND_GRPC_TARGET` / `50052` wiring in the compose files. The real device ping (`RunPing` in `run.proto`) is kept.
- **Dead code:**
  - **API:** the `gt` re-export hack, unused `jobRunsHandler.create`/`update`, the unused backend `requireAuth` Hono middleware, and stale `run.resolveHosts` comments.
  - **Python:** the `sse.py` helpers other than `event_payload`, `AnsibleRunner.run()`, `log_finished_callback`, `ResolvedScript`/`ResolvedScriptBundle`, and stale docstrings.
  - **Frontend:** `run-playbook-modal.tsx`, `sliding-pill-nav`, `collapsible-filters`, `search-input`, `query-state`, `useGroupRelations`, `useDeviceAssign`/`useDeviceUnassign`, `useDeviceGet`, `useJobRunGet`, `getQueryClientForResource`, and the unused `zod` and `@tailwindcss/language-server` dependencies.
- **Tooling:**
  - Make Biome pass: `img/architecture.svg` is already formatted upstream; add a `<title>` to `apps/frontend/public/logo.svg`.
  - Set `test:e2e` / `test:e2e:headed` as non-persistent in `turbo.json`; only `test:e2e:ui` stays persistent.
- **Docs:** update AGENTS.md:
  - Workspaces: add `packages/grpc` and `packages/logger`.
  - Auth plugins: add `genericOAuth`.
  - Server env vars: add `SERVICE_TOKEN`, `ANSIBLE_GRPC_TARGET`, `LOG_LEVEL` and `SEED_*`.
  - Backend path aliases: it uses `#` subpath imports, not `@/`.
  - Features: update the list.
  - Tests: add Playwright E2E, how to run it and its prerequisites.
  - Ansible: the health path and the `ANSIBLE_PLAYBOOK_PATH` status, as settled by `fix-compose-deploy`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `rpc-api`:
  - Removes the `v1.private.data` requirement.
  - Removes the stale "Resolve run procedure" requirement, which has no exposed procedure.
  - Adds a requirement for UUID ID validation and `NOT_FOUND` on missing resources.
- `api-key-management`: adds a requirement that the API key procedures are exposed under the `v1.apiKeys` namespace.

## Impact

- **Code:**
  - `packages/api/src/v1/**`, `packages/api/src/v1/router.ts`
  - `apps/backend/src/{index.ts,grpc/**,middlewares/auth.ts,jobs/scheduler.ts}`
  - `packages/grpc/src/**` (Ping stubs and exports)
  - `proto/ping.proto`
  - `apps/ansible/app/{main.py,core/config.py,grpc/**,api/routes/**,services/ansible/**}`
  - `apps/frontend/src/**` (dead components and hooks, the `orpc.config.apiKeys` → `orpc.apiKeys` callers)
  - `apps/frontend/package.json`, `turbo.json`, `biome.json`/SVGs
  - `compose.yml`, `compose.prod.yml`, `AGENTS.md`
- **APIs:**
  - `/rpc|/api/v1/config/apiKeys/*` moves to `/rpc|/api/v1/apiKeys/*`.
  - `/rpc|/api/v1/private/data` and `/rpc|/api/v1/grpcDemo/ping` are removed.
  - `GET /ansible/api/grpc-ping-backend` on the Ansible service is removed.
  - The OpenAPI tag "Config" becomes "API Keys".
- **Ordering:** apply **after** `harden-access-control`, `fix-run-lifecycle`, `fix-compose-deploy` and `frontend-cache-hygiene`. Those changes touch the same routers and handlers (credentials, run, jobs) and the same Python runner/compose files. Doing this refactor last avoids repeated merge conflicts.
- **No database schema or migration changes.**
