## 1. Logger package & dependencies

- [x] 1.1 Add `pino` (and `pino-pretty` as dev) to the workspace catalog in the root `package.json`
- [x] 1.2 Create `packages/logger` (`@playbook-runner/logger`): exports a configured `logger` and a `child(bindings)` helper; depends only on `pino` and `@playbook-runner/env`
- [x] 1.3 Configure format/level: JSON to stdout in production, pretty (via `pino-pretty` transport) in non-production, level from `LOG_LEVEL`

## 2. Environment

- [x] 2.1 Add `LOG_LEVEL` (enum `fatal|error|warn|info|debug|trace`, default `info`) to the server schema in `packages/env/src/server.ts`
- [x] 2.2 Document `LOG_LEVEL` in the relevant `.env.example`

## 3. Request logging middleware

- [x] 3.1 Add a Hono middleware that logs method, path, status, and latency through the shared logger, with level derived from status class (info/warn/error)
- [x] 3.2 Replace `hono/logger` usage in `apps/backend/src/index.ts` with the new middleware, preserving middleware ordering (before session resolution/routers)

## 4. Replace console.* in backend

- [x] 4.1 `index.ts`: migrate/bootstrap logs (`[migrate] …`, `[bootstrap] failed`) → structured logger calls with error/cause fields
- [x] 4.2 `jobs/scheduler.ts`: replace all `console.*` (`disabled`, `started`, `reconcile failed`, per-job failure) with leveled logger calls carrying `jobId`/`err`
- [x] 4.3 `routers/rpc.ts` and `routers/docs.ts`: `onError` interceptors log the error at `error` level through the logger
- [x] 4.4 `scripts/seed.ts`: route operational status lines through the logger; keep the intentional credential banner human-readable

## 5. Replace console.* in packages/api

- [x] 5.1 `packages/api/src/jobs/executor.ts`: replace `console.error("[executor] …")` with a structured `error` log carrying `runId` and `err`

## 6. Verification

- [x] 6.1 Grep confirms no remaining `console.*` in `apps/backend/src` or `packages/api/src` (except any intentional CLI banner)
- [x] 6.2 `bun run check-types` passes
- [x] 6.3 Build the backend (`bun run build`) and smoke-run the bundle under Bun; confirm pino works bundled and emits JSON with `NODE_ENV=production`
- [x] 6.4 Run in dev and confirm pretty output and that `LOG_LEVEL=debug` surfaces debug lines
- [x] 6.5 Confirm every HTTP request still produces a request-log line (status + latency)
- [x] 6.6 `bun run check` (biome) clean
