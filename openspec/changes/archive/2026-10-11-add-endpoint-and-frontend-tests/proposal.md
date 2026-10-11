## Why

The unit suite only pins pure helpers (crypto, SSH keys, names, cron, extra vars, selection, proto mapping): none of the ~75 oRPC procedures in `packages/api/src/v1` is exercised, so a handler that forgets a `NOT_FOUND`, writes on a rejected call, lets a Git playbook be edited or maps a gRPC failure to the wrong code ships unnoticed. The frontend has no unit suite at all, and Playwright only covers login, guest redirects, the mobile menu, search and two inventory flows. The sibling `stack` template already solved this with a hermetic fake database plus shared fixtures for handlers, a `bun test` + happy-dom suite for frontend helpers, hooks and shared components, and E2E specs per surface; this change brings that same approach here.

## What Changes

- Add a test-only fake database to `packages/db` (exported as `@playbook-runner/db/testing`, outside `src/`): a Drizzle stand-in that records every awaited chain and resolves queued results per operation (`select`, `insert`, `update`, `delete`, `query.<table>.*`, plus `execute` for the job advisory lock and `transaction`), and typed row factories with fixed defaults for every table the handlers touch.
- Rework the `packages/api` preload into the `stack` shape: placeholders overwritten (not defaulted), then one process-wide `mock.module` per boundary (`@playbook-runner/db` → fake DB, `@playbook-runner/env/server` → mutable `testEnv`, `@playbook-runner/grpc` → real helpers with `getClient`/`unary`/`serverStream` replaced), and shared fixtures under `tests/fixtures/` (`context`, `db`, `env`, `grpc`, `errors`, `auth`), reachable through a new `#tests/*` subpath import.
- Add handler tests for every v1 procedure, one `describe` per method, under `packages/api/tests/v1/<feature>/`: `apiKeys`, `authConfig`, `health`, `credentials`, `inventory` (devices, groups, memberships), `playbooks` (+ folders), `repositories` (+ sync), `scripts`, `jobs` (+ job runs, metrics, rollups, live run watch), and `run` (`ping`, `run`, `command`, `script` stream handlers), plus the out-of-request modules they lean on (`run/resolve.ts`, `jobs/executor.ts`, `jobs/live.ts`, `repositories/sync.ts`).
- Add `packages/api/tests/index.test.ts` for the procedure builders (`UNAUTHORIZED` anonymous, `FORBIDDEN` pending) and a router sweep that calls every v1 procedure anonymously through `call()` and asserts that only the declared public ones (`health.check`, `authConfig.get`) let it through.
- Add a frontend unit suite: `apps/frontend/bunfig.toml` (root `tests/unit`), a preload that registers happy-dom, pins `TZ=UTC` and initialises i18n in Spanish, `@testing-library/react`, a `test` script picked up by `turbo test`, and tests for `src/lib`, browser-only hooks in `src/hooks`, shared components with logic of their own in `src/components/shared`, and the pure feature modules (`features/run/lib/*`, `features/app-shell/site-nav.ts`, `features/app-shell/model/surface-search-sources.ts`).
- Extend Playwright with a spec per product surface (inventory devices/groups/credentials, playbooks + folders, scripts, commands, jobs + scheduler + history, config/API keys, admin users, `/me`, dashboard), seeding through `/rpc` and cleaning up, plus a non-admin project so the admin gate is asserted, restructured around shared fixtures/helpers like `stack`.
- Document the conventions in `AGENTS.md` ("Misc" testing bullets): which test a change needs, the fixtures, and that E2E only runs when the user asks.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `automated-testing`: the unit suite now also covers every API procedure (against a fake database and fake gRPC client) and the frontend's helpers, hooks and shared components, `bun run test` runs the frontend suite too, and a Playwright suite covers every product surface.

## Impact

- **Code:** new `packages/db/testing/` (+ `./testing` export and `#testing/*` import in `packages/db/package.json`); `packages/api/tests/**` (setup rewritten, fixtures, ~25 new test files) and a `#tests/*` import in `packages/api/package.json`; new `apps/frontend/tests/unit/**`, `apps/frontend/bunfig.toml`, `test` script, `@test/*` tsconfig path; new and reorganised `apps/frontend/tests/e2e/**` and `playwright.config.ts` projects. No production source changes are planned; if a handler turns out to be untestable without one (e.g. a hidden module-level side effect), it is raised before changing it.
- **Dependencies:** frontend dev deps `@happy-dom/global-registrator`, `@testing-library/react`, `@testing-library/dom` (pinned via the root catalog); `pg`/`dotenv` for E2E seeding only if a spec needs direct database access (the plan prefers `/rpc`).
- **Tooling/CI:** `turbo test` gains the `frontend` suite; `@playbook-runner/api#test` declares `dependsOn: ["^generate-grpc"]` so the stubs the fixtures import exist. CI (`.github/workflows/test.yml`) keeps running `bun run test` with no services; Playwright stays out of CI.
- **Database:** none. No schema or migration is touched; the fake DB only reads the inferred row types.
