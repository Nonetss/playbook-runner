## Context

The code has drifted from AGENTS.md, and the drift is spread across `packages/api`, `apps/backend`, `apps/ansible`, `apps/frontend`, the compose files and the docs.

**Handler shapes.** Only `grpc-demo` and `api-key` follow the documented `({ context, input })` handler shape. The rest take positional arguments, for example `credentialsHandler.get(id)`, `playbooksHandler.update(id, playbook)` and `runHandler.resolveRun(playbookId, inventory)`.

**Where things live.**
- Output schemas and exported types (`Credential`, `SshKeyPair`) sit in `router.ts`.
- `playbooks/router.ts` owns `handleFolderError`.
- `credentials/router.ts` calls `generateEd25519KeyPair` directly.
- The routers for `playbooks`, `jobs` and `inventory` redefine their own input schemas and ignore their `input.ts`.

**Internal callers.** Some handler methods are also called outside a request:
- `jobsHandler.listScheduled` from `apps/backend/src/jobs/scheduler.ts`.
- `runHandler.resolve*` from `jobs/executor.ts` and `run/stream-handler.ts`.

These callers have no oRPC `Context`, which is why a mechanical conversion to `({ context, input })` doesn't work for them.

**Demo code.** Demo code spans both gRPC directions:
- Backend → Ansible: `v1.grpcDemo.ping`.
- Ansible → backend: `GET /ansible/api/grpc-ping-backend`. It calls the backend `PingService`, which is the only service registered on the backend gRPC server (port 50052).

`RunPing` in `run.proto` is separate: it is the real per-device reachability check used by the ping modal, and it stays.

The frontend reaches the api-key feature through `orpc.config.apiKeys.*` (`features/config/hooks/use-api-keys.ts`, `navbar-authenticated.tsx`). No frontend or E2E code uses `v1.private` or `v1.grpcDemo`.

This change runs after the other four audit changes (`harden-access-control`, `fix-run-lifecycle`, `fix-compose-deploy`, `frontend-cache-hygiene`). Those changes edit the same credentials and run routers, the jobs executor, the Python runner and the compose files. Implementation must start from their merged state and keep their behavior, such as admin-only credentials and hidden `privateKey`.

## Goals / Non-Goals

**Goals:**
- Every procedure-backing handler matches the AGENTS.md shape, and every router only wires procedures together.
- One source of truth per schema: `input.ts` and `output.ts`.
- Demo endpoints and dead code are gone from all three apps, so the attack surface and the maintenance surface both shrink.
- ID validation and `NOT_FOUND` behave the same way across features.
- `bun run check`, `bun run check-types` and Biome pass cleanly.
- AGENTS.md describes the repository as it actually is.

**Non-Goals:**
- No database schema or migration changes.
- No new features and no change to the authorization model; that belongs to `harden-access-control`.
- No change to the run/stream protocol; that belongs to `fix-run-lifecycle`.
- No deletion or scaffolding of `openspec/changes/migrate-frontend-base-ui`. The user decides.
- No UI library migration (Radix → Base UI).

## Decisions

### D1. Handlers only back procedures; internal helpers move into feature modules
Methods on `<feature>Handler` are the ones called from `router.ts`, and they take `({ context, input })`. Logic that also runs outside a request moves into a named helper module next to the feature, as AGENTS.md's "extra feature-specific modules" allows:

- `run/resolve.ts`: `resolveRun`, `resolveScript`, `resolveDevice`, `resolveHosts`. Used by `run/stream-handler.ts` and `jobs/executor.ts`.
- `jobs/schedule.ts` (or an existing jobs module): `listScheduled`. Used by the backend scheduler.

The handler methods that need these functions call the helpers.

*Alternative considered:* make `context` optional in the handler signature so the scheduler can call handlers directly. Rejected. It breaks the uniform shape AGENTS.md requires, and it would let request-less code paths silently skip any future per-user checks.

### D2. The api-key feature is mounted as `apiKeys` with flat methods
The router key goes from `config: { apiKeys: { list, create, delete } }` to `apiKeys: { list, create, delete }`, and the paths become `/rpc/v1/apiKeys/list` and similar. Other renames:
- Exports: `apiKeyHandler` and `apiKeysRouter`.
- OpenAPI tag: "Config" becomes "API Keys".
- The folder stays `api-key/`.

The frontend `features/config` UI keeps its folder name; only its oRPC calls change.

*Alternatives considered:*
- `apiKey: { apiKeys: {...} }`, which gives the redundant path `/apiKey/apiKeys/list`.
- Keeping `config` and documenting it as an exception, which leaves the drift in place.

This is a breaking change for external API consumers. It is accepted because the API is pre-1.0 and internal.

### D3. Remove the whole backend gRPC server, not just PingService
Once `PingService` is gone, the backend gRPC server hosts nothing. That means removing:

- **Backend:** `apps/backend/src/grpc/**` and its bootstrap/shutdown in `apps/backend/src/index.ts`.
- **Proto and generated code:** `proto/ping.proto` and the Ping exports in `packages/grpc/src/stubs.ts`. The stubs regenerate through `generate-grpc`.
- **Ansible service:** `backend_channel` / `backend_grpc_target` in `apps/ansible/app/{main.py,core/config.py}`, the `PingServicer` registration and `grpc_demo.py`.
- **Compose:** `BACKEND_GRPC_TARGET` and the `50052` expose entries in `compose.yml` and `compose.prod.yml`.

The server-side helpers in `packages/grpc` (`startGrpcServer`, token interceptor) are deleted if nothing else imports them after the removal. Git history keeps them if an Ansible→backend callback is needed later.

*Alternative considered:* keep the backend gRPC server empty "for future callbacks". Rejected. It would be an open, token-guarded port with nothing behind it, plus a startup path to maintain (YAGNI).

### D4. UUID validation through one shared schema
`packages/api` gets one `idSchema = z.uuid()` (Zod 4). The inventory router already has `uuidSchema`, which moves into a shared module (for example `#v1/shared/schemas`, or a root `#schemas` exact key added to `imports` per the AGENTS.md barrel rule). Every `id` / `*Id` input field uses it. Zod failures already surface as oRPC `BAD_REQUEST`.

### D5. NOT_FOUND in handlers
Single-row handlers check the result of `select … where id` and of `update/delete … returning()`, and throw `errors.NOT_FOUND()` when it is empty. `errors` is the constructor map from `#errors`, never `new ORPCError`. Output schemas then drop `.nullable()` where it only existed for the missing-row case. The frontend already treats oRPC errors through `useResourceMutation` / query error states, so no UI contract changes beyond the error type.

### D6. Updates set updatedAt and strip the id
Update handlers build the set clause from `input` minus `id`, plus `updatedAt: new Date()`. Where a table uses `$onUpdate`, the explicit value is redundant but harmless. The implementer verifies against `packages/db/src/schema/*` and does not edit the schema.

### D7. Biome for SVG
`img/architecture.svg` was already reformatted upstream (3cd95c7), so it needs no Biome exclusion. `apps/frontend/public/logo.svg` gets a `<title>`, a small real accessibility fix.

### D8. turbo E2E tasks
`test:e2e` and `test:e2e:headed` finish on their own, so they drop `persistent: true`, which lets them run under `turbo run` with dependencies. `test:e2e:ui` is interactive and stays persistent.

## Risks / Trade-offs

- **[External clients break on `/config/apiKeys` → `/apiKeys` and on the removed demo routes]** → Call it out in the commit/PR notes. The OpenAPI document regenerates, and Scalar shows the new paths.
- **[Large mechanical refactor collides with the four earlier changes]** → Explicit ordering: apply last and start from their merged state. Tasks are grouped per feature, so each can be checked with `check-types` before moving on.
- **[Tightening IDs to UUID rejects IDs that used to "work"]** → Every PK is a Postgres `uuid`, so non-UUID IDs already failed with a 500. Only the error code changes.
- **[Removing `.nullable()` from outputs changes frontend types]** → `astro check` flags every consumer. Update `?? null` handling where it is now dead.
- **[Deleting "unused" frontend hooks or components that a pending branch needs]** → Each deletion is re-verified with a repo-wide grep at apply time. The code stays in git history.
- **[Removing the backend gRPC server changes backend startup logs and compose]** → Covered by `docker compose up` smoke in tasks: the backend is healthy and a device ping still works through `RunPing`.

## Migration Plan

1. Apply after the other four audit changes are merged.
2. Implement per feature. After each feature, run `bun run check-types` and `bun run check`.
3. Regenerate the gRPC stubs (`bun run check-types` triggers `generate-grpc`) after the proto removal.
4. Smoke test: `bun run dev`, then log in and exercise each section (API keys, credentials, inventory, playbooks, scripts, jobs, run). Check `/scalar` for the new paths and tag. Run `docker compose up` and ping a device.
5. Rollback: revert the change. No data migration is involved.

## Open Questions

- **Should the frontend `features/config` folder also be renamed**, for example to `features/api-keys`? It currently hosts only the API-key UI. This design leaves it alone and only updates the oRPC calls. Rename it if the user prefers.
- **`openspec/changes/migrate-frontend-base-ui` is an empty skeleton**, with no proposal or tasks. The user decides whether to scaffold it properly or remove it. This change does not touch it.
