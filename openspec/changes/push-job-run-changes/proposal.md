## Why

Job runs are the only state in the app that changes without the viewer doing anything: the cron scheduler, another tab or another user starts them, and they move from `running` to `ok`/`failed` on their own. Every view that shows runs learns about this by polling (3 s or 15 s) with a 60 s `staleTime` on a QueryClient shared across page swaps, and only two manual invalidations exist. As a result, `/jobs/history`, the dashboard and the jobs list lag by up to 15 s, or longer after returning to a page whose cache still counts as fresh. On the job detail page, a scheduled run that starts while no other run is `running` is never noticed, because the per-job list only polls while one of its rows is `running`. `adopt-orpc-publisher-for-live-runs` already put an in-process publisher in the jobs feature, so the backend can push run changes instead of every view guessing when to refetch.

## What Changes

- The job executor publishes a run change (`runId`, `jobId`, `status`, `trigger`) on a jobs-wide channel when a run opens (`running`) and when it finishes (`ok`/`failed`), whatever started it (scheduler or `jobs.run`).
- New streaming procedure `jobs.runs.watchChanges` (`/rpc/v1/jobs/runs/watchChanges`): opens with a `subscribed` event, then streams every run change until the caller leaves. It is protected (no `pending` users) and takes no input.
- Frontend: one subscription for the whole app, mounted in the persisted authenticated navbar island, that invalidates the run-derived queries on each change: the job's `runs.list`, the run's `runs.get`, `runs.listAll`, `runs.metrics` and `runs.rollups`. It reconnects with backoff and invalidates all of them once on every (re)subscribe, so changes missed while disconnected are caught.
- These polls go away: `useJobRunsList` (3 s while running), `useJobRunGet` (3 s while running), and `useJobRunsAll`, `useJobRunMetrics` and `useJobRunRollups` (15 s when `live`). The two manual invalidations (after `jobs.run` and after a watched run settles) go away too, since the change event covers them.
- Job detail page follows new runs: when a run of this job starts while the page shows the job's newest run (the default, or the latest one selected), the new run becomes the selected run and the console attaches to it live, whether it came from the scheduler, another tab or this one.

Not in scope:
- push for inventory, credentials, playbooks, scripts, API keys, users, repositories or job CRUD (only changed by the viewer's own actions, which already invalidate);
- detaching interactive runs;
- a navbar "running jobs" indicator.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `job-run-history`: adds requirements that run views (history feed, metrics, rollups, per-job run list, run detail) reflect run starts and finishes as they happen without polling, that the run-change stream exists with its contract, and that the job detail page follows a new run of its job.

## Impact

- `packages/api/src/v1/jobs/events.ts`: new `run-changed` channel, publish and subscribe helpers.
- `packages/api/src/v1/jobs/executor.ts`: publish on open (both `executeJob` and `startJobRun`) and on finish (`completeRun`'s `finally`).
- `packages/api/src/v1/jobs/{handler,router,output}.ts`: `jobRunsHandler.watchChanges` / `jobRunsRouter.watchChanges` and the event schema; the OpenAPI document gains one procedure.
- `apps/frontend/src/features/jobs/hooks/`: new `use-job-run-changes.ts`; polling and manual invalidations removed from `use-jobs.ts`.
- `apps/frontend/src/features/app-shell/components/navbar-authenticated.tsx`: mounts the subscription (skipped for `pending` users).
- `apps/frontend/src/features/jobs/components/job-detail-page.tsx`: follows a newly started run.
- Tests: API unit tests for the channel and the executor publishing; frontend unit tests for the invalidation hook and the follow-new-run rule; existing job E2E specs must keep passing.
- Builds on the committed code of `adopt-orpc-publisher-for-live-runs`, whose manual and E2E checks are still open; no database, migration, gateway or Ansible changes.
