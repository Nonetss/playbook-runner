## Context

Job runs are already persisted by `executor.ts` into `job_runs` with `status`, `trigger`, `eventsJson`, `startedAt`, `finishedAt`, `error`, and `createdAt`. Today the only read path is `jobRunsHandler.listByJob(jobId)` exposed as `jobs.runs.list`, plus `jobs.runs.get(id)`. The dashboard (`dashboard-page.tsx`) already renders `StatCard`s and a jobs panel using `useJobsList`, so there is an established place to surface activity and metrics. oRPC procedures live in `packages/api/src/routers/jobs.ts` with handlers in `packages/api/src/handlers/jobs.ts`; frontend data access goes through per-feature hooks (`useJobs.ts`) over the oRPC/TanStack Query client.

This change is read-only aggregation over existing data. No new tables, no change to how runs are produced.

## Goals / Non-Goals

**Goals:**

- A cross-job, paginated run feed ordered newest-first, resilient to deleted parent jobs.
- Windowed aggregate metrics (totals, success rate, avg duration) and per-job rollups, computed in SQL.
- Reuse: surface the same data on a new history page and on the existing dashboard.

**Non-Goals:**

- No notifications/alerting on failure (separate future change).
- No live streaming of in-flight runs into the feed — the feed reflects persisted rows; the existing per-run detail view keeps its live console.
- No new retention/pruning policy for `job_runs`.
- No changes to scheduling or execution behavior.

## Decisions

**Aggregate in SQL, not in JS.** `metrics` and per-job rollups are computed with Drizzle aggregate queries (`count`, `count() filter (where status = 'ok')`, `avg(finished_at - started_at)`) over `job_runs`, rather than fetching rows and reducing in the handler. Rationale: keeps payloads small and correct as the table grows. Alternative (fetch-and-reduce) was rejected because it doesn't scale and duplicates logic already expressible in SQL.

**Cursor pagination over `(created_at, id)`.** `listAll` takes an optional cursor and a `limit`, returning rows plus the next cursor. Rationale: stable pagination as new runs are inserted at the head; offset pagination would shift under concurrent inserts. The join to `jobs` supplies `name`; a `LEFT JOIN` keeps runs whose `job_id` is null (deleted job) with a null name that the API maps to a placeholder.

**Duration is derived, never stored.** Computed as `finishedAt - startedAt`, returned as milliseconds or `null` when either bound is missing. Rationale: avoids a redundant column and keeps a single source of truth. Runs that are `pending`/`running` report `null` duration.

**Index for the read path.** Add an index on `job_runs(created_at desc)` and `job_runs(job_id, created_at desc)` to back the feed ordering and per-job rollups. This is the one migration in the change (index-only, no data change).

**New endpoints under the existing jobs router.** `jobs.runs.listAll` and `jobs.runs.metrics` extend `jobsRouter` rather than introducing a new top-level router, matching how `jobs.runs.list/get` are already nested. Frontend gets `useJobRunsAll` (infinite query) and `useJobRunMetrics` hooks in the `jobs` feature.

## Risks / Trade-offs

- **`job_runs` growth over time** → aggregate/feed queries slow down. Mitigation: the added indexes cover the ordering and filter columns; metrics are windowed (bounded scan). A retention/prune policy is out of scope but noted as a follow-up.
- **Metrics window semantics ambiguity** (created vs finished within window) → Decision: window filters on `created_at`, avg duration considers only finished runs inside it; documented so the UI labels match.
- **Duration skew for still-running rows** → returned as `null`, and the UI must render "—" rather than 0; covered by a spec scenario.
- **Deleted-job runs** → `LEFT JOIN` + placeholder name prevents them dropping out of the feed or erroring; covered by a spec scenario.

## Migration Plan

1. Add the index-only Drizzle migration for `job_runs` and run `db:generate` + `db:migrate`.
2. Ship handler + router endpoints (backward compatible; existing `jobs.runs.list/get` untouched).
3. Add frontend hooks, the history page, and dashboard panels.
4. Rollback is trivial: the endpoints and page are additive; dropping the index and the new procedures restores prior behavior with no data loss.

## Open Questions

- Default metrics window and whether it is user-selectable (e.g. 24h / 7d / 30d toggle) or fixed initially — leaning toward a small fixed set of presets surfaced in the UI.
- Whether the history page needs status/trigger filters in v1 or can start unfiltered and add them later.
