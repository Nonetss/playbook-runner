## Why

The scheduler already executes jobs and persists every run to `job_runs` (status, trigger, captured SSE events, `startedAt`/`finishedAt`, `error`), but that data is only reachable one job at a time via `jobs.runs.list`. There is no cross-job view of "what has been running lately" and no aggregate signal (success rate, durations, failure counts). An operator running scheduled playbooks against real infrastructure has no way to notice that a nightly job has been failing, or to see recent activity at a glance. The data is already there — it just isn't surfaced.

## What Changes

- Add a **global run history**: a paginated, most-recent-first feed of runs across **all** jobs, each showing job name, status, trigger (manual/schedule), duration, and timestamp. New page `/jobs/history` with a navbar/section entry.
- Add **aggregate metrics** over a time window: total runs, success rate, failed count, and average duration, plus per-job rollups (last status + recent success ratio) usable for sparklines.
- Surface a **"Recent activity" panel** and run-metric stat cards on the existing dashboard, reusing the same endpoints.
- Add two oRPC endpoints under the jobs router: `jobs.runs.listAll` (cross-job, paginated) and `jobs.runs.metrics` (windowed aggregates). No schema change — `job_runs` already stores everything needed; duration is derived from `startedAt`/`finishedAt`.

## Capabilities

### New Capabilities

- `job-run-history`: Cross-job observability of job executions — a paginated global run feed and windowed aggregate metrics (success rate, counts, durations, per-job rollups), surfaced on a dedicated history page and the dashboard.

### Modified Capabilities
<!-- None. Existing job execution / scheduling behavior is unchanged; this change only reads and aggregates the runs already recorded. -->

## Impact

- **Backend / oRPC** (`packages/api`): extend `jobRunsHandler` with `listAll(limit, cursor)` and `metrics(window)` queries (aggregate SQL over `job_runs` joined to `jobs` for names); add `jobs.runs.listAll` and `jobs.runs.metrics` procedures to `jobsRouter`. No DB migration.
- **Frontend** (`apps/frontend`): new `pages/jobs/history/index.astro`; extend the `jobs` feature with a history list/table component and hooks (`useJobRunsAll`, `useJobRunMetrics`); add a "Recent activity" panel and metric stat cards to `dashboard-page.tsx`; navbar/section entry in `Layout.astro`.
- **i18n**: new keys in the `jobs` (and/or `dashboard`) namespaces for history and metrics labels.
- **Performance**: aggregate queries run over `job_runs`; add an index on `job_runs(created_at)` (and/or `(job_id, created_at)`) if the table is expected to grow large — noted in design.
- **Security**: read-only over data the authenticated user can already reach via `jobs.runs.list`; no new privilege surface.
