## Context

Backend logging is currently a mix of Hono's `logger()` middleware (request lines) and scattered `console.log`/`console.error` in `apps/backend/src/index.ts` (bootstrap/migrate), `jobs/scheduler.ts`, `routers/rpc.ts`, `routers/docs.ts`, `scripts/seed.ts`, and `packages/api/src/jobs/executor.ts`. Output is unstructured with ad-hoc `[prefix]` conventions. The runtime is Bun (backend) but code is bundled and also imported from `packages/api`, so a shared logger must work in both the app and the package. Env is centralized in `packages/env` via `@t3-oss/env-core` with a server schema.

## Goals / Non-Goals

**Goals:**
- One configured pino logger instance shared by `apps/backend` and `packages/api`.
- Structured JSON in production, pretty output in dev, level from env.
- Replace all backend/API `console.*` and Hono's request logger with the shared logger.

**Non-Goals:**
- No per-request correlation IDs / tracing in this change (can follow later).
- No log shipping/transport configuration (stdout only; the container platform collects it).
- No change to the `seed.ts` CLI's intentional human-readable report beyond routing operational lines through the logger.
- No frontend logging changes.

## Decisions

**Where the logger lives: a small `@playbook-runner/logger` package.** Both `apps/backend` and `packages/api` need it, and `packages/api` must not depend on the app. A dedicated tiny package (exporting a configured `logger` and a `child(bindings)` helper) is the clean shared home. Alternative — colocating in `packages/env` — was considered but rejected: env is about validated config, not runtime services, and mixing them muddies that boundary. The logger package reads level/format from `@playbook-runner/env`.

**pino with pino-pretty in dev only.** `pino` is the runtime dependency; `pino-pretty` is a dev dependency wired via a transport when a dev pretty flag is on. In production the logger writes single-line JSON to stdout. Rationale: pino is the de-facto structured logger, fast, and JSON-first; pretty printing stays out of the production dependency/runtime path. Added through the workspace catalog for a single pinned version.

**Level and format from env.** Add `LOG_LEVEL` (enum `fatal|error|warn|info|debug|trace`, default `info`) to the env server schema, and derive pretty-vs-JSON from `NODE_ENV` (pretty only in non-production, gated so it never activates in prod). This keeps format selection code-free.

**Request logging via a Hono middleware over pino.** Replace `hono/logger` with a small middleware that logs method, path, status, and duration through the shared logger at `info` (and `warn`/`error` for 4xx/5xx as appropriate), so request and application logs share one stream and format. A full `pino-http` integration isn't a drop-in for Hono's fetch model, so a thin middleware calling the shared logger is preferred over adapting `pino-http` internals.

**Mechanical `console.*` replacement with structured fields.** Each call site moves identifiers into the log object: `console.error("[scheduler] job "+id+" failed:", err)` → `log.error({ jobId: id, err }, "scheduled job failed")`. The RPC/docs `onError` interceptors log the error object at `error` level. `seed.ts` keeps its formatted credential banner (it's an intentional operator-facing CLI report) but routes operational status lines through the logger.

## Risks / Trade-offs

- **`packages/api` gaining a logger dependency** → keep the logger package dependency-light (pino only) so it stays cheap to import from a library; it already depends on `@playbook-runner/env`.
- **Pretty transport accidentally enabled in prod** (perf/format regression) → gate pretty strictly on non-production `NODE_ENV`; default path is JSON.
- **Bundling pino with tsdown/`noExternal`** → verify the backend bundle builds and runs under Bun with pino included; pino's worker-thread transport (pretty) is dev-only, so the prod bundle avoids that path. Covered in verification tasks.
- **Behavioral parity of request logs** → ensure the replacement middleware still logs every request (status + latency) so operators don't lose the visibility Hono's logger gave.

## Migration Plan

1. Add `@playbook-runner/logger` package (pino) and `LOG_LEVEL` to env; add pino/pino-pretty to the catalog.
2. Swap the Hono request logger for the pino-backed middleware in `index.ts`.
3. Replace `console.*` call sites in backend and `packages/api`.
4. Build the backend bundle and smoke-run under Bun to confirm pino works bundled; verify JSON in prod mode and pretty in dev.
5. Rollback: revert the logger wiring; no data or API surface changed.

## Open Questions

- Exact request-log level policy for 4xx vs 5xx (single `info` line with status field, or level derived from status) — leaning toward level derived from status class.
- Whether to add a lightweight per-request id now or defer — defaulting to defer (Non-Goal) unless trivial with the chosen middleware.
