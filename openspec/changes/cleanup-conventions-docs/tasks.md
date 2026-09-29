## 0. Preconditions

- [x] 0.1 Confirm `harden-access-control`, `fix-run-lifecycle`, `fix-compose-deploy` and `frontend-cache-hygiene` are applied, then rebase onto their merged state. Preserve their behavior (admin-only procedures, hidden `privateKey`, run cancellation) through every refactor below.
- [x] 0.2 Record a baseline: `bun run check-types` and `bunx biome check .` output.

## 1. Shared API schemas

- [x] 1.1 Add one shared `idSchema = z.uuid()` module to `packages/api`. Add an exact `imports` key if it is a barrel. Remove the local `uuidSchema` copies in `inventory/router.ts` and `playbooks/router.ts`.
- [x] 1.2 Move the run resolution helpers (`resolveRun`, `resolveScript`, `resolveDevice`, `resolveHosts`) out of `runHandler` into `packages/api/src/v1/run/resolve.ts`. Update `run/stream-handler.ts` and `jobs/executor.ts` to import them. Delete the stale `run.resolveHosts` procedure comments.
- [x] 1.3 Move `listScheduled` out of `jobsHandler` into a jobs helper module. Update `apps/backend/src/jobs/scheduler.ts`.

## 2. Feature refactors (packages/api/src/v1)

For each feature:
- Create or complete `input.ts`/`output.ts` and move the inline router schemas into them.
- Convert handler methods to `({ context, input })`.
- Keep `router.ts` as wiring only.
- Use `idSchema` for every id field.
- Throw `errors.NOT_FOUND()` on missing rows.
- Set `updatedAt` and strip `id` on updates.
- Run `bun run check-types` after each feature.

- [x] 2.1 `credentials`:
  - Move the credential output schemas and the `Credential`/`SshKeyPair` types to `output.ts`.
  - Add `credentialsHandler.generate` that wraps `generateEd25519KeyPair`, so the router no longer calls it directly.
- [x] 2.2 `playbooks`, including `folders`:
  - The router already uses `playbooksInput.playbook`, `.folderId` and `.move` (since 70bb915). Move the remaining inline `folderInput` and the `id` inputs into `playbooks/input.ts` as well, and make `playbooksInput.id` a UUID.
  - Move `handleFolderError` into the handler (or `folders.ts`) so that handlers throw `errors.BAD_REQUEST` themselves.
- [x] 2.3 `scripts`: `output.ts`, handler signature, `NOT_FOUND`, `updatedAt`. Stop passing `id` into `.set()`.
- [x] 2.4 `inventory` (groups, devices, deviceGroups):
  - Make the router use `inventory/input.ts`.
  - Add `output.ts`.
  - Convert the `inventoryGroupHandler`/`inventoryDeviceHandler`/`inventoryDeviceGroupHandler` signatures.
- [x] 2.5 `jobs`, including `runs`:
  - Make the router use `jobs/input.ts`.
  - Add `output.ts`.
  - Remove the `gt` re-export hack (`jobRunsHandler.gt` and `export { gt }`).
  - Delete the unused `jobRunsHandler.create`/`update` after grepping for callers, including `executor.ts`.
  - Update the `@playbook-runner/api/v1/jobs/handler` import in `apps/backend` if its shape changed.
- [x] 2.6 `run`: `output.ts` for the stream event/done schemas; move them out of `router.ts`.
- [x] 2.7 `health`: confirm it already matches the shape. It is public and takes no id, so only the signature changes if needed.

## 3. API key namespace rename (BREAKING)

- [x] 3.1 Rename the exports `configHandler` → `apiKeyHandler` and `apiKeyRouter` → `apiKeysRouter`. Flatten the router to `{ list, create, delete }`, set the OpenAPI tag to "API Keys", and mount it as `apiKeys` in `packages/api/src/v1/router.ts`.
- [x] 3.2 Update the frontend callers: `orpc.config.apiKeys.*` → `orpc.apiKeys.*` in `features/config/hooks/use-api-keys.ts` and `features/app-shell/components/navbar-authenticated.tsx`. Grep `apps/frontend/tests` for the old path.
- [ ] 3.3 Verify in `/scalar` and `/openapi.json` that the procedures appear under `/api/v1/apiKeys/*` and that `/rpc/v1/config/apiKeys/list` returns 404.

## 4. Remove demo endpoints and the backend gRPC server

- [x] 4.1 Delete `packages/api/src/v1/private/` and `packages/api/src/v1/grpc-demo/`, and remove them from `v1/router.ts`. Grep the whole repo for `private.data`, `grpcDemo` and `grpc-demo`.
- [x] 4.2 Delete `apps/backend/src/grpc/**` and remove the gRPC server bootstrap/shutdown from `apps/backend/src/index.ts`.
- [x] 4.3 Delete `proto/ping.proto`. Remove the Ping exports from `packages/grpc/src/stubs.ts`. If nothing else uses the server-side helpers in `packages/grpc` (`startGrpcServer`, `stopGrpcServer`, the server token interceptor), remove them too. Regenerate the stubs.
- [x] 4.4 In the Ansible service:
  - Delete `app/grpc/services/ping.py` and `app/api/routes/grpc_demo.py`.
  - Remove the `PingServicer` registration in `app/grpc/server.py`, the `backend_channel` in `app/main.py`, and `backend_grpc_target` in `app/core/config.py`.
  - Update `app/grpc/stubs.py`.
- [x] 4.5 Remove `BACKEND_GRPC_TARGET` and the `50052` expose entries from `compose.yml` and `compose.prod.yml`. Remove any env example entries too.
- [x] 4.6 Remove the unused backend Hono `requireAuth` middleware in `apps/backend/src/middlewares/auth.ts`. Keep the session middleware.

## 5. Ansible service dead code

- [x] 5.1 Remove `sse()` and `stream_runner_events` from `app/services/ansible/sse.py`, keeping `event_payload`, and fix its module docstring. Consider renaming the module if only `event_payload` remains.
- [x] 5.2 Remove `AnsibleRunner.run()` and `log_finished_callback` (`events.py`), and `ResolvedScript`/`ResolvedScriptBundle` (`models.py`). Before deleting each one, grep to confirm it still has no callers after `fix-run-lifecycle`.
- [x] 5.3 Fix stale docstrings, for example `app/api/routes/health.py` "Current-user route". Run `bun run check-types`, which covers BasedPyright, and `bun run format`, which covers Ruff.

## 6. Frontend dead code

- [x] 6.1 Delete `features/playbooks/components/run-playbook-modal.tsx` and its re-export in `features/playbooks/index.tsx`.
- [x] 6.2 Delete `components/ui/sliding-pill-nav.tsx`, `components/shared/form/collapsible-filters.tsx`, `components/shared/form/search-input.tsx` and `components/shared/layout/query-state.tsx`, re-grepping each first.
- [x] 6.3 Delete the unused hooks: `useGroupRelations`, `useDeviceAssign`, `useDeviceUnassign`, `useDeviceGet`, `useJobRunGet` and `getQueryClientForResource`.
- [x] 6.4 Remove `zod` and `@tailwindcss/language-server` from `apps/frontend/package.json`, confirming there are no imports, then run `bun install`.
- [ ] 6.5 Run `bun run check-types` (`astro check`) and the E2E smoke via `bun run test:e2e`, with the backend running and the DB seeded.

## 7. Tooling

- [x] 7.1 Add a `<title>` to `apps/frontend/public/logo.svg`. (`img/architecture.svg` was already reformatted upstream in 3cd95c7, so no Biome exclusion is needed.) `bunx biome check .` must report 0 errors.
- [x] 7.2 In `turbo.json`, drop `persistent: true` from `test:e2e` and `test:e2e:headed`, and keep it on `test:e2e:ui`.

## 8. AGENTS.md

- [x] 8.1 Workspaces: add `packages/grpc` (proto codegen, gRPC client) and `packages/logger`. Document `proto/` at the root.
- [x] 8.2 Auth: list the `genericOAuth` plugin and the access model settled by `harden-access-control`. Env: add `SERVICE_TOKEN`, `ANSIBLE_GRPC_TARGET`, `LOG_LEVEL` and `SEED_*`, plus any new vars from the other changes.
- [x] 8.3 Path aliases: state that `apps/backend` uses `#` subpath imports (`"#*": "./src/*.ts"`), not `@/`.
- [x] 8.4 Features: update the list (drop `private`, `grpc-demo`; rename api-key mount to `apiKeys`), and document the `run/resolve.ts` style of helper module for logic called outside requests.
- [x] 8.5 Misc: replace "No test framework" with the Playwright E2E setup, covering the `test:e2e*` scripts, the prerequisites (backend running, seeded admin) and which parts are persistent.
- [x] 8.6 Docker/env: document what `fix-compose-deploy` left, and remove the `50052` backend gRPC mention:
  - The Ansible service is internal-only (`expose` 8000/50051); `compose.debug.yml` publishes 8000 for debugging.
  - Its healthcheck probes `GET /api/health` (no `/ansible` prefix) and a TCP connect to gRPC 50051, in both `compose.yml` and `compose.prod.yml`.
  - `ANSIBLE_PLAYBOOK_PATH` is gone. `STATE_DIR` holds `known_hosts`: `.data/ansible-runner` locally, the `ansible_state` named volume at `/app/state` in Docker. Replace the "Env & runtime gotchas" bullet about the bind mount.
  - `SSH_HOST_KEY_POLICY` (`accept-new` default | `strict` | `off`).
  - The Ansible image runs as non-root UID 10001 with `uv` pinned.
  - CI (`docker-build.yml`) builds `-backend`, `-ansible` and `-frontend` and pushes to GHCR with `GITHUB_TOKEN`, not Gitea/`MY_PASSWORD`.

## 9. Verification

- [x] 9.1 Run `bun run check-types` and `bunx biome check .` with no errors.
- [ ] 9.2 Manual smoke with `bun run dev`: API keys, credentials, inventory, playbooks and folders, scripts, jobs and runs, and ad-hoc run/command/ping. Malformed ids return `BAD_REQUEST`, and unknown UUIDs return `NOT_FOUND`.
- [ ] 9.3 `docker compose up --build`: all services are healthy, the backend no longer listens on 50052, and a device ping works.
- [ ] 9.4 User decision, which this change does not do: scaffold `openspec/changes/migrate-frontend-base-ui` properly with `openspec new change`, or remove the empty skeleton.
