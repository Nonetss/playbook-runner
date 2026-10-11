## Context

See proposal.md (Why). The relevant code today:

- **Backend, publisher.** `packages/api/src/v1/jobs/events.ts` holds one `MemoryPublisher` (on `globalThis`) with per-run channels `run:<runId>`. `jobs/live.ts` is the replay registry behind `jobs.runs.watch`, whose handler takes `signal`.
- **Backend, executor.** `jobs/executor.ts`: both entry points call `openRun` (a transaction that inserts the `running` row under an advisory lock) and then `completeRun`. `executeJob` is used by the scheduler (`apps/backend/src/jobs/scheduler.ts`) and awaits; `startJobRun` is used by `jobs.run` and does not await. `completeRun` persists the outcome and calls `finishLiveRun` in its `finally`. `recoverOrphanedRuns` runs once at boot, before anyone can subscribe.
- **Frontend, queries.** All run queries live in `apps/frontend/src/features/jobs/hooks/use-jobs.ts`, on top of `orpc = createTanstackQueryUtils(client.v1)`:
  - `useJobRunsList` polls every 3 s while a loaded row is `running`;
  - `useJobRunGet` polls every 3 s while `running`;
  - `useJobRunsAll`, `useJobRunMetrics` and `useJobRunRollups` poll every 15 s with `live`.
  - Callers: `history-page.tsx`, `dashboard-page.tsx`, `jobs-page.tsx`, `job-detail-page.tsx`.
  - The QueryClient is a browser singleton (`lib/query-client.ts`, `staleTime` 60 s) shared by every island.
- **Frontend, navbar.** `NavbarAuthenticated` is mounted `client:only` with `transition:persist="navbar-auth"` (`layouts/Layout.astro`). It lives for the whole session across soft navigations, including for `pending` users on `/me`.
- **Frontend, job detail.** `job-detail-page.tsx` selects the newest run by default, auto-attaches `useJobRunWatch` when the selected run shows `running`, and focuses and attaches after its own `jobs.run`.

## Goals / Non-Goals

**Goals:**
- One push channel for run lifecycle changes, fed only by the executor.
- One browser subscription per signed-in session that keeps every run query current through invalidation.
- No timer polling for run data.
- Job detail follows new runs of its job.

**Non-Goals:**
- Pushing the run events themselves to list views. Lists refetch; live output stays on `jobs.runs.watch`.
- Optimistic cache writes from events. Invalidation keeps one source of truth, the API.
- Per-user filtering (jobs are global: no owner column).
- Multi-instance delivery.

## Decisions

### 1. A jobs-wide `run-changed` channel on the existing publisher
`JobEvents` gains:
```ts
"run-changed": { runId: string; jobId: string; status: "running" | "ok" | "failed"; trigger: "manual" | "schedule" }
```
It is published through `publishRunChange()` and read through `subscribeRunChanges(signal)` (`maxBufferedEvents: Infinity`, as for run channels).
- One shared channel, because every authenticated user may see every job.
- Payload ids only; the client refetches what it shows.
- *Alternative: a channel per job.* Rejected: the list views (history, dashboard, rollups) need all jobs, and per-job subscriptions would multiply streams per tab.

### 2. Publish from `completeRun`, the single funnel
- **`running`:** published at the top of `completeRun`, right after `beginLiveRun(runId)`. Both entry points reach it only after `openRun` has committed the row, so a client that refetches on this event finds the run, and one that attaches `watch` finds it live.
- **Terminal status:** published in the `finally`, right after `finishLiveRun`, with the status actually written (`failed` when the first update threw). If even the fallback update fails, the row stays `running` until `recoverOrphanedRuns`. The event is still published, best effort, matching `finishLiveRun`'s "always release" rule.
- `job.id` and `trigger` are known in `completeRun`, which receives `job`. `trigger` is passed in from `openRun`'s caller.

### 3. `jobs.runs.watchChanges`: subscribed first, then changes
- `followRunChanges(signal)` in `jobs/live.ts` (or a sibling `jobs/changes.ts`, plain functions per AGENTS.md) does the following:
  - subscribes synchronously;
  - yields `{ type: "subscribed" }`;
  - yields `{ type: "changed", ...change }` for each message;
  - returns normally when `signal` aborts;
  - `finally` awaits `live.return()`.
- Handler: `jobRunsHandler.watchChanges({ context, signal })`, a streaming handler taking `signal` as AGENTS.md now allows, with no input. Router: `protectedProcedure` (so `pending` users get `FORBIDDEN`) with `.output(eventIterator(z.discriminatedUnion("type", [...])))` and `method: "POST"`, like `watch`.
- The `subscribed` event lets the client tell "connected" from "silent", which drives the reconnect refresh (decision 5).

### 4. Frontend: the navbar owns the stream; a tiny in-page bus fans out
New `apps/frontend/src/features/jobs/hooks/use-job-run-changes.ts`:
- **`useJobRunChanges({ enabled })`**, called once in `NavbarAuthenticatedInner` with `enabled: user.role !== "pending"`.
  - It consumes `client.v1.jobs.runs.watchChanges()`.
  - For each `changed` event it invalidates `orpc.jobs.runs.list.key({ input: { jobId } })` (all pages and offsets), `orpc.jobs.runs.get.queryKey({ input: { id: runId } })`, `orpc.jobs.runs.listAll.key()`, `orpc.jobs.runs.metrics.key()` and `orpc.jobs.runs.rollups.key()`.
  - It then emits the change on `features/jobs/lib/run-change-bus.ts`, a module-level `Set` of listeners with `emitRunChange` and `onRunChange(listener) → unsubscribe`.
  - Islands share module instances, which is the same assumption the QueryClient singleton relies on.
- **`useOnRunChange(listener)`** subscribes a component to the bus. Job detail uses it (decision 6).
- Invalidation marks inactive queries stale too, so a page navigated to later refetches on mount despite the 60 s `staleTime`. This covers the "returning to a page" scenario.
- *Alternative: subscribe per page.* Rejected: each Astro page swap would reopen a stream, and pages not showing runs would miss changes that make their cache stale.
- *Alternative: write events into the cache (`setQueryData`).* Rejected: the feed is paginated by cursor, the metrics are aggregates, and patching them client-side would duplicate server logic.

### 5. Reconnect and refresh
- Reuse `isTransportError` and `reattachDelay` from `features/jobs/lib/run-watch-retry.ts`.
- This subscription is ambient, so it retries **without an attempt limit** at the capped 8 s delay. It stops on a non-transport error (`UNAUTHORIZED`/`FORBIDDEN`: the session ended) or when `enabled` turns false or the island unmounts.
- The delay resets after a `subscribed` event.
- On every `subscribed` **except the first** in this island's life, it invalidates all five run query families once. Changes during the gap are caught. On a full page load the cache is fresh, so the first `subscribed` would only cause duplicate requests.

### 6. Job detail follows new runs
- A pure helper `shouldFollowNewRun({ pageJobId, change, selectedId, newestRunId })` in `features/jobs/lib/run-change-bus.ts` (or a sibling `lib` module). It is true when all of these hold:
  - `change.status === "running"`;
  - `change.jobId === pageJobId`;
  - `selectedId === null || selectedId === newestRunId || selectedId === change.runId`.
- On true, `job-detail-page.tsx` calls its existing `focusRun(change.runId)`. The existing effect then attaches `watch` once `useJobRunGet`/the refetched list shows the run as `running`.
- `handleRunNow` keeps focusing its own run right away. The later event is then a no-op (`selectedId === change.runId`).
- `newestRunId` is `runs[0]?.id` from the deduplicated list the page already computes.

### 7. Removing polling and manual invalidations
- Drop `refetchInterval` from the five hooks and remove their `live` option and its call-site arguments (`history-page.tsx`, `dashboard-page.tsx`, `jobs-page.tsx`, `job-detail-page.tsx`).
- Drop the `onSuccess` invalidation in `useJobRun` and the "watched run settled" effect in `job-detail-page.tsx`.
- `useJobRunWatch` is unchanged: live output still comes from `jobs.runs.watch`.

## Risks / Trade-offs

- **[A user without the stream (e.g. a blocked proxy) gets no updates at all, since polling is gone]** → It reconnects forever. React Query's focus refetch still applies once data is older than `staleTime`, and every user action that already invalidates keeps doing so.
- **[Metrics windows slide with time, not only with run changes]** → A run leaving the 24 h window between changes is picked up on the next change, focus refetch or navigation. Acceptable for a summary card.
- **[Burst of changes (many cron jobs on the same minute) causes a burst of refetches]** → React Query dedupes in-flight refetches per key, and only mounted queries refetch; inactive ones are just marked stale.
- **[One more long-lived HTTP stream per tab through the gateway]** → Same transport as `jobs.runs.watch`. The stream carries a handful of small events per run. Idle periods are covered by oRPC's own event-iterator keep-alive comments (on by default every 5 s in `@orpc/standard-server-fetch`), which `watch` already relies on through the gateway.
- **[The module-level bus assumes islands share module instances]** → Already true for the QueryClient singleton. A unit test asserts the bus wiring; E2E covers the page.

## Migration Plan

No data or contract migration. The API gains one procedure, and older frontends simply don't call it. Deploy backend and frontend together. To roll back, revert. The previous polling comes back with the old frontend.
