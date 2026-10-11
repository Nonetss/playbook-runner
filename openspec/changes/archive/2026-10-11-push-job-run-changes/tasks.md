## 1. Backend: run-change channel

- [x] 1.1 In `packages/api/src/v1/jobs/events.ts`, add the `"run-changed"` channel (`{ runId, jobId, status: "running" | "ok" | "failed", trigger: "manual" | "schedule" }`) with `publishRunChange(change)` and `subscribeRunChanges(signal?)` (`maxBufferedEvents: Number.POSITIVE_INFINITY`); verify with `bun run --filter @playbook-runner/api check-types`
- [x] 1.2 Add `followRunChanges(signal?)` (plain function next to the registry, e.g. `jobs/changes.ts`): subscribe synchronously, yield `{ type: "subscribed" }`, then `{ type: "changed", ...change }` per message; return normally on abort; `finally` awaits `live.return()`. Cover in `packages/api/tests/v1/jobs/changes.test.ts`: `subscribed` comes first; changes published after it arrive in order; aborting during silence ends the iterator at once; an already-aborted signal yields nothing. Verify `bun run --filter @playbook-runner/api test`
- [x] 1.3 In `jobs/executor.ts`, pass `trigger` into `completeRun`, publish `running` right after `beginLiveRun`, and publish the persisted terminal status right after `finishLiveRun` in the `finally`. Extend `tests/v1/jobs/executor.test.ts`, then verify the suite passes:
  - `executeJob` (schedule) and `startJobRun` (manual) each publish `running` then `ok`/`failed` with the right ids and trigger;
  - a run whose result cannot be stored still publishes `failed`;
  - a conflict and a missing job publish nothing.

## 2. Backend: `jobs.runs.watchChanges`

- [x] 2.1 Add the event schema to `jobs/output.ts`: `jobRunsOutput.watchChanges = eventIterator(z.discriminatedUnion("type", [subscribed, changed]))`. Add `jobRunsHandler.watchChanges({ context, signal })` returning `followRunChanges(signal)`, and wire `jobs/router.ts` with `protectedProcedure` → `.route({ summary, description, tags: ["Jobs"], method: "POST" })` → `.output(...)`, forwarding `signal`. Verify `check-types`, that `/openapi.json` gains only `jobs/runs/watchChanges` (diff a generated spec against the previous one), and that the router test (`tests/v1/router.test.ts`) still passes, extended if it enumerates procedures

## 3. Frontend: subscription and bus

- [x] 3.1 Add `apps/frontend/src/features/jobs/lib/run-change-bus.ts` with `emitRunChange`, `onRunChange(listener) → unsubscribe` and the pure `shouldFollowNewRun({ pageJobId, change, selectedId, newestRunId })`. Cover them in `apps/frontend/tests/unit/features/jobs/run-change-bus.test.ts`:
  - listeners receive changes and stop after unsubscribing;
  - follow when nothing is selected, when the newest run is selected, or when the run itself is selected;
  - don't follow for another job, a finished status, or when an older run is selected.
- [x] 3.2 Add `features/jobs/hooks/use-job-run-changes.ts`:
  - `useJobRunChanges({ enabled })` consumes `client.v1.jobs.runs.watchChanges()`;
  - on `changed` it invalidates the job's `runs.list`, the run's `runs.get`, and `runs.listAll`, `runs.metrics` and `runs.rollups`, then emits on the bus;
  - on every `subscribed` after the first it invalidates all five families;
  - on transport errors it retries without limit using `reattachDelay` (reset after `subscribed`);
  - it stops on non-transport errors, on `enabled` false or on unmount;
  - `useOnRunChange(listener)` wraps the bus.

  Cover them in `tests/unit/features/jobs/use-job-run-changes.test.ts` with the `mock.module("@/lib/orpc")` pattern from `use-job-run-watch.test.ts`: the invalidated keys per change, no invalidation on the first `subscribed`, a full invalidation after a reconnect, retry past 5 attempts, a stop on `FORBIDDEN`, and no stream while `enabled` is false. Verify `bun run --filter frontend test`. (The `@/lib/orpc` mock moved to a shared `tests/unit/fixtures/orpc.ts`, since `mock.module` holds for the whole run, and `use-job-run-watch.test.ts` now uses it too; both hooks catch the async `unsubscribe` rejection of a call that is still failing.)
- [x] 3.3 Mount `useJobRunChanges({ enabled: user.role !== "pending" })` in `NavbarAuthenticatedInner` (`features/app-shell/components/navbar-authenticated.tsx`). Verify `bun run --filter frontend check-types`

## 4. Frontend: remove polling, follow new runs

- [x] 4.1 In `features/jobs/hooks/use-jobs.ts`:
  - remove `refetchInterval` from `useJobRunsList`, `useJobRunGet`, `useJobRunsAll`, `useJobRunMetrics` and `useJobRunRollups`;
  - drop their `live` option and update the doc comments;
  - remove the `onSuccess` invalidation in `useJobRun`;
  - update the callers (`history-page.tsx`, `dashboard-page.tsx`, `jobs-page.tsx`, `job-detail-page.tsx`), comments included.

  Verify `check-types`, and that `grep -rn refetchInterval apps/frontend/src/features` returns nothing.
- [x] 4.2 In `job-detail-page.tsx`:
  - remove the "watched run settled" invalidation effect;
  - add `useOnRunChange`, which calls `focusRun(change.runId)` when `shouldFollowNewRun` holds (with `newestRunId = runs[0]?.id`);
  - keep `handleRunNow` as is.

  Verify `check-types` and the bus tests from 3.1.

## 5. Verification

- [x] 5.1 Run `bunx biome ci .`, `bun run check-types` and `bun run test`; all pass
- [x] 5.2 Manual check with the dev stack, open in two tabs:
  - **History page:** triggering a job from the other tab shows the run as `running` and then its terminal status within a second, with no periodic `/rpc/v1/jobs/runs/*` requests in DevTools while idle.
  - **Job detail on its latest run:** a run started from the other tab (or by a one-minute cron) becomes selected and streams live.
  - **Job detail on an older run:** the selection stays.
  - **Reconnect:** stop and start the backend container; the stream reconnects and the views refresh once.
- [x] 5.3 Run the job-related Playwright E2E specs (`bun run test:e2e`, with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` set for this stack) and verify they pass, in particular "ejecutar ahora termina y aparece en el historial"
