## Context

See proposal.md (Why). Current state that shapes the approach:

- `packages/api` already runs `bun test` with `root = "./tests"` and a preload (`tests/setup.ts`) that only assigns env placeholders. Its 8 test files cover pure modules and import them through `#v1/...`. There is no `#tests/*` import, no fixture and nothing standing in for the database or gRPC.
- Every handler imports the module-level `db` from `@playbook-runner/db` (which calls `drizzle(env.DATABASE_URL)` on import) and builds plain Drizzle chains: `select`, `insert`, `update` and `delete` (including `$dynamic()`-style composition, `leftJoin`, keyset `where`/`orderBy`/`limit` and un-awaited subqueries passed into other selects), two `db.transaction` calls (`jobs/executor.ts` `openRun`, `repositories/sync.ts`) and one `tx.execute(sql\`select pg_advisory_xact_lock(...)\`)`. The relational `db.query.*` API is not used today.
- gRPC goes through `@playbook-runner/grpc` (`getClient`, `unary`, `serverStream`, `isGrpcError`, `grpcStatus`) with ts-proto stubs from the gitignored `src/gen/`. `run/proto.ts` and `jobs/executor.ts` drop `heartbeat` frames.
- `SERVICE_TOKEN` is optional in `@playbook-runner/env/server` (as in `stack`) and the handlers guard on `!env.SERVICE_TOKEN` → `SERVICE_UNAVAILABLE`. Writing the tests showed that `repositories/sync.ts` read it inside its `try`, so a missing token surfaced as `INTERNAL_SERVER_ERROR` (and was stored as the sync error); with the user's approval it now reads the token first, before any query or call, like the run streams.
- `jobs/live.ts` keeps a process-wide registry of live runs and drops finished entries after a 30 s `setTimeout` (not `unref`'d). `startJobRun` detaches `completeRun` with `void ...catch`.
- `apps/frontend` has no `test` script, no `bunfig.toml`, no DOM library. Its tsconfig extends `astro/tsconfigs/strict` and includes `**/*`, so anything under `tests/` is type-checked by `astro check`. UI copy goes through i18next (`initI18n(locale)` in `src/lib/i18n/index.ts`, `es` default) — components render keys, not literals.
- Playwright (`apps/frontend/tests/e2e`) signs in the seeded admin in `auth.setup.ts`, pins the `locale=es` cookie, and talks to `/rpc/v1/*` with `x-csrf-token: orpc`. Public sign-up is disabled, so a non-admin account can only be created by an admin (`/api/auth/admin/create-user`).
- The `stack` reference implementation: `packages/db/testing/{fake-db,rows,index}.ts`, `packages/api/tests/{setup.ts,fixtures/*}`, `apps/frontend/tests/unit/setup.ts`, `.agents/skills/stack/references/{testing,writing-unit-tests}.md`.

## Goals / Non-Goals

**Goals:**
- Port `stack`'s test infrastructure as-is wherever the code shapes match, and adapt only where playbook-runner differs (required `SERVICE_TOKEN`, `execute` inside a transaction, i18n, live-run registry).
- Every v1 procedure reachable from `appRouter` gets at least its access, not-found, nothing-written-on-rejection and success-mapping tests, plus the domain rules listed in the delta spec.
- Leave production source untouched, except for defects the tests expose, each approved by the user first (so far: the `SERVICE_TOKEN` read in `repositories/sync.ts`).

**Non-Goals:**
- Database integration tests against a real PostgreSQL (still "not set up yet" per AGENTS.md).
- Tests for `apps/backend` (Hono wiring, CSRF plugin, scheduler loop, seed), Astro pages/layouts/middleware, feature components under `src/features/*/components`, and hooks built on TanStack Query or Better Auth's client — the E2E suite covers those paths instead.
- Tests for the Ansible `RunnerService` RPCs (user decision); the existing pytest suite stays as it is.
- Running Playwright in CI, or coverage thresholds.

## Decisions

### 1. Fake database in `packages/db/testing`, copied from `stack`, plus `execute`

Copy `stack`'s `createFakeDb()` (Proxy-based thenable chains, per-op FIFO queues, `queue`/`queueError`/`calls`/`reset`, `stepArgs`, `transaction(fn)` running `fn` with the fake itself) and extend `FakeDbOp` with `"execute"` so `tx.execute(sql...)` is recorded and resolved like any other chain. Export it as `@playbook-runner/db/testing` (`"./testing"` export + `"#testing/*": "./testing/*.ts"` import, placed before `"#*"`), outside `src/` so it is never bundled by `tsdown` (the backend only imports `.`/`./schema/*`).

`testing/rows.ts` gets one factory per table the handlers read (`credentialRow`, `deviceRow`, `groupRow`, `deviceGroupRow`, `playbookRow`, `playbookFolderRow`, `repositoryRow`, `scriptRow`, `jobRow`, `jobRunRow`, plus `NOW`), each a complete `$inferSelect` row with fixed defaults and `...overrides`, so tests stay cast-free.

*Alternatives:* PGlite or a throwaway Postgres with the migrations applied — rejected: violates "no external services", needs the migrations pipeline we must not touch, and is the separate "integration tests" item. Per-file `mock.module` of `drizzle-orm` — rejected: mocks leak across files in `bun test`.

### 2. One preload, three process-wide boundaries

Rewrite `packages/api/tests/setup.ts` in `stack`'s shape:

1. `Object.assign(process.env, placeholders)` (keep the current values, including `CREDENTIALS_ENCRYPTION_KEY` and `SERVICE_TOKEN`, `ANSIBLE_GRPC_TARGET: "grpc.test:50050"`, `LOG_LEVEL: "fatal"`, `JOB_SCHEDULER_ENABLED: "0"`), then set the optional integration vars to `""` (`SKIP_ENV_VALIDATION`, `GENERIC_OAUTH_*`) — `""` rather than `delete`, because `dotenv/config` refills unset vars.
2. `mock.module("@playbook-runner/db", () => ({ db: fakeDb.db, createDb: () => fakeDb.db }))`.
3. Dynamically import `#tests/fixtures/env` and mock `@playbook-runner/env/server` with `testEnv`, a mutable copy of the validated env. The placeholder sets `SERVICE_TOKEN`, so `resetEnv()` restores it **on** (gRPC paths are the common case here); tests of the `SERVICE_UNAVAILABLE` branch set `testEnv.SERVICE_TOKEN = undefined`.
4. Mock `@playbook-runner/grpc` with `{ ...await import("@playbook-runner/grpc/client"), authMetadata, getClient, unary: grpc.unary, serverStream: grpc.serverStream }` so `isGrpcError`/`grpcStatus` stay real (the existing `run/proto.test.ts` keeps working).

Fixtures (`tests/fixtures/`): `db.ts` (the shared `fakeDb`), `env.ts`, `grpc.ts` (`grpc.unary`/`grpc.serverStream` mocks, `streamOf(events, failure?)`, `controlledStream()`, `grpcError(code)`, `settle()`; status codes taken from the real `grpcStatus`, not re-declared), `context.ts` (`anonymousContext`, `pendingContext`, `userContext`, `adminContext`), `errors.ts` (`expectErrorCode`), `auth.ts` (Better Auth API-key shapes for `spyOn(auth.api, ...)`). Add `"#tests/*": "./tests/*.ts"` before `"#*"` in `packages/api/package.json`.

*Alternative:* keep handler tests calling a real Drizzle against an unreachable URL and catching errors — rejected, it tests nothing.

### 3. Handler-level tests for rules, `call()` for the router contract

- Rules that live in a handler (or in `run/resolve.ts`, `repositories/sync.ts`, `jobs/executor.ts`, `jobs/live.ts`, `playbooks/folders.ts`) are tested by calling the handler/function directly, queuing DB results in await order and asserting `fakeDb.calls(...)`/`stepArgs(...)`.
- Rules that live in the builder, middleware, input or output schema use `call(procedure, input, { context })` from `@orpc/server`: `tests/index.test.ts` (anonymous → `UNAUTHORIZED`, `pending` → `FORBIDDEN`), the private-key checks (output strips extra fields *and* the handler never selects the `privateKey` column — both asserted), and the **router sweep**: `tests/v1/router.test.ts` walks `v1Router` recursively, calls each procedure with `anonymousContext()` and `{}` input, and asserts the set that did *not* reject with `UNAUTHORIZED` equals `{ "health.check", "authConfig.get" }`. Auth runs before input validation because `requireAuth` is `.use()`d before `.input()`, so `{}` is enough. The allowlist is the one exact list we keep: it is a security contract and must change deliberately.

File layout mirrors `src/` (one `describe` per method, English sentence test names):

```
packages/api/tests/
  index.test.ts
  fixtures/{auth,context,db,env,errors,grpc}.ts
  v1/router.test.ts
  v1/api-key/handler.test.ts        v1/auth-config/handler.test.ts
  v1/health/handler.test.ts         v1/credentials/handler.test.ts
  v1/inventory/{devices,groups,memberships}.test.ts
  v1/playbooks/{handler,folders}.test.ts
  v1/repositories/{handler,sync}.test.ts
  v1/scripts/handler.test.ts
  v1/jobs/{handler,runs,executor,live,schedule}.test.ts
  v1/run/{stream-handler,resolve}.test.ts
```

### 4. Streams, detached runs and the live registry

- Interactive run handlers are async generators: collect with `for await`, assert precondition failures with `expectErrorCode(gen.next(), ...)`. Cancellation is asserted by returning early from the consumer and checking that the `serverStream` mock's generator ran its `finally` (the fixture's `controlledStream` throws on abort like a real call).
- `startJobRun` detaches `completeRun`: tests attach with `watchLiveRun(runId)` and consume until the `done` frame instead of sleeping; queued DB results cover `openRun` (transaction → `execute` → select → insert) and `completeRun`'s final update.
- The registry is process-wide and its TTL timer is not unref'd: each test uses a fresh run id, and `live.test.ts` drives the TTL with `jest.useFakeTimers()`/`advanceTimersByTime(30_000)`, restoring real timers in `afterEach`. `bun test` exits as soon as the files finish, so pending TTL timers do not hold it and `live.ts` stays untouched.

### 5. Frontend unit suite mirrors `stack`, with i18n in the preload

- `apps/frontend/bunfig.toml`: `[test] root = "./tests/unit"`, `preload = ["./tests/unit/setup.ts"]`. `playwright.config.ts` already restricts itself to `tests/e2e`.
- `setup.ts`: `process.env.TZ = "UTC"`, `GlobalRegistrator.register({ url: "http://localhost:4321/" })` (the native-dev origin; `history.replaceState` needs a real one), `mock.module("astro:transitions/client", …)` (a Vite-only virtual module that `AppLink` reaches; the fake lives in `tests/unit/fixtures/astro.ts` so tests can assert navigations), then `await initI18n("es")` so components render the Spanish copy the tests query. `tests/unit/bun-env.d.ts` references `bun` types so `astro check` knows `bun:test`; `@types/bun` is added to the frontend devDependencies from the catalog.
- `@test/*` → `./tests/*` added to tsconfig `paths`; `@/` keeps resolving `src/` (Bun reads tsconfig paths).
- Libraries: `@happy-dom/global-registrator`, `@testing-library/react`, `@testing-library/dom`, pinned in the root catalog. No `user-event`, no `jest-dom` (same as `stack`).
- Layout: `tests/unit/lib/<file>.test.ts`, `tests/unit/hooks/<hook>.test.tsx`, `tests/unit/components/<group>/<component>.test.tsx`, and `tests/unit/features/<feature>/<file>.test.ts` for the pure feature modules this repo has that `stack` does not (`run/lib/*`, `app-shell/site-nav.ts`, `app-shell/model/surface-search-sources.ts`) and the browser-only feature hooks (`use-selection-toggle`, `use-follow-output`, `use-collapsed-sections`, `use-theme`).

*Alternative:* Vitest + jsdom — rejected: a second runner, and `stack` standardised on `bun test` + happy-dom.

### 6. E2E: shared fixtures, API seeding, an extra non-admin project

- Restructure into `tests/e2e/fixtures.ts` (`adminPage`, `userPage` via `storageState`), `helpers/{locale,hydration,auth,rpc,seed}.ts` (move today's `helpers.ts` content there; `rpc<T>(page, path, json)` from `inventory-all-group.spec.ts` becomes shared).
- `auth.setup.ts` signs in the seeded admin (as today), then creates the fixed non-admin account `e2e-user@playbook-runner.local` through the admin endpoint only if it does not exist, and saves `playwright/.auth/user.json`.
- Each surface spec seeds with `rpc(...)` using names prefixed `e2e-<testInfo.testId>` and deletes what it created in `afterEach`, so specs are order-independent and repeatable. No direct SQL, so no `pg` dependency in the frontend.
- Projects: `setup`, `chromium-guest` (protected pages → `/login`), `chromium-admin` (every surface spec, replaces `chromium-auth`), `chromium-user` (admin pages refused, `pending`-free flows), `chromium-mobile`. `testMatch` by folder (`tests/e2e/admin/**`, `tests/e2e/user/**`, ...) instead of a growing regex.
- Execution screens (playbook/script run, command, ping) target a device on `192.0.2.10` (TEST-NET-1, never routable) and assert the console opens and reaches a terminal outcome, without asserting which (the runner may be up or down in the developer's stack).

### 7. Tooling

- `turbo.json`: `"@playbook-runner/api#test": { "dependsOn": ["^generate-grpc"], "cache": false }` so the stubs exist on a clean checkout without running `check-types` first.
- `apps/frontend/package.json`: `"test": "bun test"`; `turbo test` and CI pick it up with no other change.
- AGENTS.md "Misc" testing bullets updated: the suites, the fixtures, "a handler change ships with its handler test", and that E2E only runs on demand.

## Risks / Trade-offs

- [Fake DB asserts calls, not SQL — a wrong `where` passes] → Accepted, same trade-off as `stack`; tests assert the rule-bearing outcomes (codes, written values, no writes on rejection), and real SQL stays covered by E2E.
- [Tests coupled to await order of DB calls] → Queue order failures name the missing op, which makes refactors cheap to update; prefer asserting by op (`calls("update")`) over global order unless order is the rule.
- [Importing `@playbook-runner/auth` builds Better Auth over the fake `db`] → It already works this way in `stack`; if the adapter probes the db at import, add the probed property to the fake rather than mocking `@playbook-runner/auth`.
- [`mock.module` is process-wide] → Only the preload mocks modules; every other replacement is `spyOn` on a real object, reset in `afterEach`.
- [Live-run TTL timer may hold the test process] → fake timers in `live.test.ts`, fresh run ids elsewhere; escalate before a production `.unref()`.
- [E2E against the developer's database] → prefixed names + cleanup, one persistent non-admin account; E2E never runs without the user asking.
- [Large surface: ~75 procedures] → tasks are grouped per feature so the work can land in reviewable slices, each green on its own.

## Migration Plan

Pure test/tooling change: no deploy, no data migration. Rollback is reverting the commits; production bundles are unaffected because `packages/db/testing` and every `tests/` directory are outside what `tsdown`/Astro build.
