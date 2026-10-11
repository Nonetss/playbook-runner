## 1. Fake database (`packages/db/testing`)

- [x] 1.1 Port `stack`'s `packages/db/testing/fake-db.ts` (chains, per-op queues, `queue`/`queueError`/`calls`/`reset`, `stepArgs`, `transaction`) and add the `execute` op; verify with `bun run --filter @playbook-runner/db check-types`
- [x] 1.2 Add `testing/rows.ts` with complete `$inferSelect` factories + `NOW` for credentials, devices, groups, device↔group, playbooks, playbook folders, repositories, scripts, jobs and job runs, and `testing/index.ts` re-exporting both; verify `check-types` passes with no casts outside the one documented in the fake
- [x] 1.3 Add the `"./testing"` export and `"#testing/*"` import (before `"#*"`) to `packages/db/package.json`; verify `import { createFakeDb } from "@playbook-runner/db/testing"` type-checks from `packages/api` and that `bun run --filter backend build` output does not contain `testing/`

## 2. API test infrastructure (`packages/api/tests`)

- [x] 2.1 Add `"#tests/*": "./tests/*.ts"` before `"#*"` in `packages/api/package.json` and `"@playbook-runner/api#test": { "dependsOn": ["^generate-grpc"], "cache": false }` in `turbo.json`; verify `rm -rf packages/grpc/src/gen && bun run --filter @playbook-runner/api test` regenerates stubs and passes
- [x] 2.2 Write fixtures `tests/fixtures/{db,env,grpc,context,errors,auth}.ts` as in design §2 (`resetEnv()` restores `SERVICE_TOKEN` on; grpc codes from the real `grpcStatus`; contexts `anonymous`/`pending`/`user`/`admin`); verify `check-types`
- [x] 2.3 Rewrite `tests/setup.ts`: overwrite placeholders, clear optional vars to `""`, mock `@playbook-runner/db`, `@playbook-runner/env/server` and `@playbook-runner/grpc` once; verify the 8 existing test files still pass and that exporting a bogus `DATABASE_URL`/`SERVICE_TOKEN` in the shell does not change the result
- [x] 2.4 Add a self-test `tests/fixtures/fake-db.test.ts` (unqueued op rejects with its name, FIFO per op, `transaction` records a marker and routes `tx` writes, `execute` resolves queued value, `queueError` rejects); verify it fails when the "no result queued" check is removed

## 3. API access contract

- [x] 3.1 `tests/index.test.ts`: `protectedProcedure` rejects anonymous with `UNAUTHORIZED` and `pending` with `FORBIDDEN`, lets `user`/`admin` through; verify by temporarily dropping the pending check and seeing it fail
- [x] 3.2 `tests/v1/router.test.ts`: walk `v1Router`, `call()` every procedure anonymously with `{}`, assert the non-rejecting set equals `{ health.check, authConfig.get }`, and that those two return `"OK"` / `{ ssoEnabled }`; verify it fails when one protected procedure is switched to `publicProcedure`

## 4. Simple feature handlers

- [x] 4.1 `tests/v1/health/handler.test.ts` and `tests/v1/auth-config/handler.test.ts` (`ssoEnabled` false with the `GENERIC_OAUTH_*` trio empty, true when `testEnv` sets all three); verify `bun run --filter @playbook-runner/api test`
- [x] 4.2 `tests/v1/api-key/handler.test.ts` with `spyOn(auth.api.listApiKeys|createApiKey|deleteApiKey)`: list maps `apiKeys` (and `[]` on null), create forwards `configId: "default"`, name and `expiresIn` only when set, delete returns `{ id, success }` and forwards the caller's headers; verify the suite passes
- [x] 4.3 `tests/v1/scripts/handler.test.ts`: create/list/get/update/delete — `NOT_FOUND` paths, `updatedAt` set and `id` absent from `.set()`, `INTERNAL_SERVER_ERROR` when insert returns nothing; verify the suite passes and a deliberately removed `NOT_FOUND` makes it fail
- [x] 4.4 `tests/v1/credentials/handler.test.ts`: `generate` returns an OpenSSH pair, `create` stores `privateKey` encrypted (`v1:` prefix, decrypts back) and never selects/returns it (assert `returning`/`select` step args exclude `privateKey`, and via `call()` the output has no `privateKey`), get/update/delete `NOT_FOUND`, update re-encrypts only when a new key is sent (per handler); verify the suite passes

## 5. Inventory, playbooks and repositories

- [x] 5.1 `tests/v1/inventory/devices.test.ts`: CRUD with `NOT_FOUND`, writes and mapping, nothing written on rejection; verify the suite passes
- [x] 5.2 `tests/v1/inventory/groups.test.ts`: CRUD, reserved group name (`all`, case per `inventory/name.ts`) → `BAD_REQUEST` with nothing written, `NOT_FOUND`; verify the suite passes
- [x] 5.3 `tests/v1/inventory/memberships.test.ts`: `assign`, `unassign`, `list`, `listByDevice`, `listByGroup` — missing device/group behaviour and idempotent repeat per the handler; verify the suite passes
- [x] 5.4 `tests/v1/playbooks/folders.test.ts`: folder CRUD and `assertFolderExists` (`null`/`undefined` passes without a query, missing folder → `BAD_REQUEST`); verify the suite passes
- [x] 5.5 `tests/v1/playbooks/handler.test.ts`: create/list/listByFolder/get, and `update`/`move`/`delete` on a `source: "git"` playbook → `FORBIDDEN` with no write, on a missing one → `NOT_FOUND`, on a manual one → written values; verify it fails if the Git guard is removed from `update`
- [x] 5.6 `tests/v1/repositories/handler.test.ts`: CRUD, missing credential → `BAD_REQUEST` with nothing written, `NOT_FOUND`, delete also asks the runner to drop the mirror (per handler), `sync`/`branches`/`playbooks` delegate; verify the suite passes
- [x] 5.7 (exposed a defect, fixed with the user's approval: `repositories/sync.ts` now reads `SERVICE_TOKEN` before its `try`) `tests/v1/repositories/sync.test.ts`: missing `SERVICE_TOKEN` → `SERVICE_UNAVAILABLE` with no gRPC call; gRPC `INVALID_ARGUMENT`/`RESOURCE_EXHAUSTED`/`UNAVAILABLE` → `BAD_REQUEST`/`TOO_MANY_REQUESTS`/`BAD_GATEWAY`, non-gRPC → `INTERNAL_SERVER_ERROR`; successful sync upserts discovered files as `source: "git"` inside a transaction, marks vanished ones `missing: true`, stores `lastCommitSha`; `listRemoteBranches` request/response mapping; verify the suite passes

## 6. Run streams and resolution

- [x] 6.1 `tests/v1/run/resolve.test.ts`: `resolveRun`/`resolveScript`/`resolveDevice`/`resolveHosts` — not found, credential-less host, precondition (Git playbook not synced/missing), validation (empty selection, reserved extra vars), decrypted key only in the built hosts, Git source pinned to `lastCommitSha`; verify the suite passes
- [x] 6.2 `tests/v1/run/stream-handler.test.ts` for `ping`, `run`, `command`, `script`: `SERVICE_UNAVAILABLE` before any call, resolver errors → `NOT_FOUND`/`BAD_REQUEST`/`PRECONDITION_FAILED`, events forwarded in order with heartbeats dropped, `RESOURCE_EXHAUSTED` → `TOO_MANY_REQUESTS`, lost stream (`INTERNAL`/`UNAVAILABLE`/`CANCELLED`) → `BAD_GATEWAY`, consumer `return()` cancels the stream (`controlledStream` sees the abort); verify it fails if `run/proto.ts` yields heartbeat frames (removing the `continue` alone is a no-op: a heartbeat frame carries no task, done or error)

## 7. Jobs

- [x] 7.1 `tests/v1/jobs/handler.test.ts`: list/get/create/update/delete/toggleEnabled (`toJobColumns` normalisation: omitted optionals stored as `null`), `NOT_FOUND`, `run` → `CONFLICT` when already running and `NOT_FOUND` when gone (through queued `openRun` results); verify the suite passes
- [x] 7.2 `tests/v1/jobs/runs.test.ts`: `jobs.runs.list`/`get`/`listAll` (keyset cursor: `nextCursor` only when a full page comes back, decodes to the last row, deleted job → placeholder name), `metrics` (zeroed empty window, ratios), `rollups`; freeze the clock with `setSystemTime`; verify the suite passes
- [x] 7.3 `tests/v1/jobs/executor.test.ts`: `openRun` takes the advisory lock (`execute` recorded inside the `transaction`) and refuses while a `running` row exists; `executeJob` stores events and final status without heartbeats, stores a lost-stream error as the run error, never throws; `startJobRun` returns the run id immediately and finishes in the background (await through `watchLiveRun`, no sleeps); verify the suite passes
- [x] 7.4 `tests/v1/jobs/live.test.ts`: late subscriber gets the backlog then live events, ends on `done`, unknown run behaviour, finished entry dropped after the TTL (`jest.useFakeTimers`); fresh run id per test; verify the suite passes and `bun test` exits promptly (escalate before any `.unref()` change)
- [x] 7.5 `tests/v1/jobs/schedule.test.ts`: `listScheduledJobs` selects only id + cron of enabled jobs; verify the suite passes

## 8. Frontend unit suite setup

- [x] 8.1 Add `@happy-dom/global-registrator`, `@testing-library/react`, `@testing-library/dom` to the root catalog and, with `@types/bun`, to `apps/frontend` devDependencies; add `"test": "bun test"`; verify `bun install` succeeds and the lockfile updates
- [x] 8.2 Add `apps/frontend/bunfig.toml` (`root = "./tests/unit"`, preload), `tests/unit/setup.ts` (TZ, happy-dom at `http://localhost:4321/`, `await initI18n("es")`), `tests/unit/bun-env.d.ts`, and `@test/*` in tsconfig `paths`; verify `bun run --filter frontend test` runs a trivial test, ignores `tests/e2e`, and `bun run --filter frontend check-types` passes

## 9. Frontend unit tests

- [x] 9.1 `tests/unit/lib/`: `fold-text`, `format` (frozen clock), `recent-surfaces` (per-user, limit, dedupe, malformed/throwing storage → `[]`), `view-state`, `app-surfaces`, `icon-registry`, `utils`, `scroll-root`, `i18n/resolve` (cookie → Accept-Language → default); verify `bun run --filter frontend test`
- [x] 9.2 `tests/unit/features/`: `run/lib/run-selection`, `run/lib/run-inventory-url` (round trip keeps groups and devices), `app-shell/site-nav` (searchable surfaces grouped like the nav), `app-shell/model/surface-search-sources` (properties, not exact lists); verify the round-trip test fails if devices are dropped
- [x] 9.3 `tests/unit/hooks/`: `use-hydrated`, `use-on-open`, `use-current-path`, `use-mobile`, `use-scrolled`, `use-scroll-restoration`, `use-confirm`, and the browser-only feature hooks `use-selection-toggle`, `use-follow-output`, `use-collapsed-sections`, `use-theme` (`renderHook`, `act`, fake timers where needed, `cleanup()`); verify the suite passes
- [x] 9.4 `tests/unit/components/`: `form/segmented-picker`, `form/form-dialog`, `form/field-label`, `feedback/query-state`, `feedback/inline-alert`, `data-display/status-dot`, `data-display/row-actions-menu`, `resource/entity-list` — query by role and Spanish accessible name, assert visible text and callback arguments, no class/snapshot assertions; skip any that turn out to hold no logic and note it; verify the suite passes

## 10. End-to-end suite

- [x] 10.1 Restructure `tests/e2e` into `fixtures.ts` + `helpers/{locale,hydration,auth,rpc,seed}.ts`, move existing specs onto them, and switch `playwright.config.ts` to folder-based projects (`setup`, `chromium-guest`, `chromium-admin`, `chromium-user`, `chromium-mobile`); verify `bunx playwright test --list` lists every existing test (do not run the suite)
- [x] 10.2 Extend `auth.setup.ts` to create the non-admin `e2e-user@playbook-runner.local` through the admin endpoint only when missing and save `playwright/.auth/user.json`; verify with `--list` and type-check
- [x] 10.3 Admin surface specs, each seeding via `rpc` with an `e2e-` prefix and cleaning up in `afterEach`: inventory (devices, groups, credentials), playbooks + folders, scripts, commands, jobs (list, new/edit, scheduler, history), config + API keys, admin users, `/me`, dashboard; execution screens target `192.0.2.10` and assert the console reaches a terminal outcome; verify `--list` and `check-types`
- [x] 10.4 `chromium-user` specs (admin pages refused, regular surfaces reachable) and extend `guest.spec.ts` to every protected route group; verify `--list` and `check-types`
- [ ] 10.5 Ask the user to run `bun run test:e2e` twice against their stack (the agent never runs it unprompted) and fix what fails

## 11. Docs and final validation

- [x] 11.1 Update AGENTS.md "Misc" testing bullets (fake DB + fixtures, which test a change needs, frontend unit suite, E2E layout and that it only runs on demand) and the `packages/db` workspace line; verify every cited path exists
- [x] 11.2 Run `bun run test`, `bun run check-types` and `bunx biome check .` from the root; all green
