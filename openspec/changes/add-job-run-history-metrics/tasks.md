## 1. Database

- [x] 1.1 Add an index on `job_runs(created_at desc)` and a composite `job_runs(job_id, created_at desc)` in `packages/db/src/schema/jobs.ts`
- [x] 1.2 Run `bun run db:generate` and `bun run db:migrate`; verify the index-only migration applies cleanly

## 2. Backend handlers

- [ ] 2.1 Add `jobRunsHandler.listAll({ limit, cursor })` to `packages/api/src/handlers/jobs.ts`: `LEFT JOIN` `jobs` for `name`, order by `(created_at, id)` desc, return rows + next cursor
- [ ] 2.2 Add `jobRunsHandler.metrics({ window })`: SQL aggregates (total, ok, failed counts, success rate, avg finished duration) filtered on `created_at` within the window; return zeroed result for an empty window
- [ ] 2.3 Add `jobRunsHandler.perJobRollups()`: latest run status + recent success ratio per job
- [ ] 2.4 Add a duration helper (`finishedAt - startedAt` → ms or `null`) and include derived `durationMs` in run rows

## 3. oRPC router

- [x] 3.1 Add `jobs.runs.listAll` procedure (input: `{ limit?, cursor? }`; output: `{ runs, nextCursor }`) to `packages/api/src/routers/jobs.ts`
- [x] 3.2 Add `jobs.runs.metrics` procedure (input: `{ window }`; output: totals, rate, avg duration)
- [x] 3.3 Add `jobs.runs.rollups` procedure for per-job rollups; map null job names to a placeholder in the output schema
- [x] 3.4 Define zod output schemas so `durationMs` is nullable and success rate is always present

## 4. Frontend data hooks

- [ ] 4.1 Add `useJobRunsAll` (TanStack infinite query over `jobs.runs.listAll`) to the `jobs` feature hooks
- [ ] 4.2 Add `useJobRunMetrics` and `useJobRunRollups` hooks

## 5. History page

- [x] 5.1 Add `apps/frontend/src/pages/jobs/history/index.astro` mounting a history feature component
- [x] 5.2 Build a run history list/table: job name, status badge, trigger, duration (render `null` as "—"), timestamp; each row links to the run detail view
- [x] 5.3 Wire pagination (load-more / infinite scroll) using the cursor
- [x] 5.4 Add a navbar/section entry for the history page in `apps/frontend/src/layouts/Layout.astro`

## 6. Dashboard surfacing

- [x] 6.1 Add run-metric stat cards (success rate, runs in window, failures) to `dashboard-page.tsx` using `useJobRunMetrics`
- [x] 6.2 Add a "Recent activity" panel showing the latest runs from `useJobRunsAll`, each linking to its run detail

## 7. i18n & polish

- [x] 7.1 Add translation keys for history/metrics labels in the `jobs` and/or `dashboard` namespaces (all supported locales)
- [x] 7.2 Run `bun scripts/check-translations.ts` to confirm no missing keys

## 8. Verification

- [ ] 8.1 `bun run check-types` passes (backend + frontend)
- [ ] 8.2 Manually verify: trigger a manual run and a scheduled run, confirm both appear in the feed with correct status/trigger/duration, metrics update, and rows open the run detail
- [ ] 8.3 `bun run check` (biome) clean
