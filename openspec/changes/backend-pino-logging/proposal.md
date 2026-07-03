## Why

Backend diagnostics are a scatter of `console.log`/`console.error` calls (in `index.ts` bootstrap, `scheduler.ts`, `executor.ts`, the RPC/docs error interceptors, and `seed.ts`) plus Hono's default `logger()` middleware, which prints unstructured, ad-hoc-prefixed lines (`[scheduler] …`, `[migrate] …`). There is no consistent format, no levels, no correlation, and nothing a log aggregator can parse. As the app runs scheduled jobs in production containers, structured JSON logs with proper levels are needed to actually operate and debug it.

## What Changes

- Introduce a single shared **pino** logger for the backend and `@playbook-runner/api`, configured once (JSON in production, pretty-printed in dev; level from env).
- Replace every backend `console.*` call with a leveled logger call carrying structured fields instead of string-prefixed messages (e.g. `log.error({ jobId, err }, "job failed")` instead of `console.error("[scheduler] job … failed:", err)`).
- Replace Hono's default `logger()` request middleware with **pino-http**-style request logging emitted through the same logger, so request logs share format and level with application logs.
- Add a `LOG_LEVEL` (and dev pretty toggle) to the env schema; keep `seed.ts` human-readable output intact where it is an intentional CLI report, but route it through the logger where it is operational.

## Capabilities

### New Capabilities

- `structured-logging`: A single configured pino logger instance shared across the backend and API package, emitting leveled structured (JSON in prod, pretty in dev) logs, with level controlled by environment.

### Modified Capabilities

- `http-server`: The "Global request logging" requirement changes from Hono's default logger to structured request logging emitted through the shared pino logger.

## Impact

- **New dependency**: `pino` (+ `pino-pretty` as a dev dependency for local formatting) added via the workspace catalog.
- **Env** (`packages/env`): new `LOG_LEVEL` (enum, default `info`) and an optional pretty-print toggle for dev.
- **Logger module**: a new shared logger (e.g. `packages/env`-adjacent or a small `packages/logger`, decided in design) importable by both `apps/backend` and `packages/api`.
- **Backend** (`apps/backend/src`): swap `console.*` in `index.ts`, `jobs/scheduler.ts`, `routers/rpc.ts`, `routers/docs.ts`, `scripts/seed.ts`; replace `hono/logger` middleware with pino-backed request logging.
- **API** (`packages/api/src`): swap `console.error` in `jobs/executor.ts`.
- **Behavior**: log output format changes (unstructured → structured); no functional/runtime behavior change beyond logging. No API or DB impact.
