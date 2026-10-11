## Context

See proposal.md (Why) for the motivation. Current shape:

- `packages/api/src/v1/jobs/live.ts` keeps a module-level `Map<runId, LiveRun>`; each entry holds an events array, a `done` result, a `nextSeq` counter and an `EventPublisher<{ frame }>` from `@orpc/server` (`@orpc/shared` 1.15.4). `watchLiveRun` replays the array, then subscribes and skips frames whose `seq` was already replayed. `EventPublisher`'s iterator buffers at most `maxBufferedEvents` (default 100) per subscriber and `shift()`s the oldest beyond that.
- `jobs/executor.ts` (`completeRun`) is the only producer: `beginLiveRun` → `publishRunEvent` per record → `finishLiveRun` in a `finally`, which also schedules the entry's removal after 30 s.
- `jobs.runs.watch` (`jobs/handler.ts`) returns `watchLiveRun(input.runId)`; its contract is `eventIterator(taskEventSchema, jobRunWatchResult)` with a nullable terminal value. The handler receives only `{ context, input }`.
- The backend's `SIGINT`/`SIGTERM` handler calls `process.exit(0)` directly (no HTTP drain), and `bun --hot` reloads modules while the job scheduler, started once behind `globalThis.__backendBootstrapped`, keeps the closures of the first module instances.
- Frontend `useJobRunWatch` (`features/jobs/hooks/use-jobs.ts`) consumes the stream with `consumeEventIterator`; any error moves `phase` to `"error"`.
- The sibling `stack` project (oRPC 2 beta, `@orpc/publisher`) already does this with `agent/events.ts` + `agent/runs.ts`; this design ports that pattern to oRPC 1.
- `packages/api/tests/v1/jobs/live.test.ts` belongs to the in-progress, uncommitted `add-endpoint-and-frontend-tests` change.

## Goals / Non-Goals

**Goals:**
- Delivery, buffering and unsubscription handled by `@orpc/experimental-publisher`; the app code keeps only the replay buffer and run lifecycle.
- Exactly-once, no-drop delivery per watcher (see specs/run-lifecycle).
- A leaving watcher releases its subscription immediately.
- The registry survives `bun --hot` in dev.
- The job run console reattaches after transport failures.

**Non-Goals:**
- Detaching interactive runs from their request (`run.*` procedures).
- Multi-instance backends (Redis publisher). The executor and scheduler are in-process, so the publisher is too.
- Using the publisher's resume (`resumeRetentionSeconds`, `lastEventId`, `ClientRetryPlugin`).
- Changing the `jobs.runs.watch` contract, the job executor's persistence or `job_runs`.
- A shutdown `AbortController` like `stack`'s: the backend exits without an HTTP drain, so open watchers end with the process anyway.

## Decisions

### 1. `@orpc/experimental-publisher` on oRPC 1, all `@orpc/*` pinned to one exact version
On oRPC 1 the package is `@orpc/experimental-publisher` (latest 1.15.5, depends on `@orpc/client`/`@orpc/shared`/`@orpc/standard-server` at exactly 1.15.5). The root catalog moves every `@orpc/*` entry from `^1.15.4` to exact `1.15.5` so a single `@orpc/shared` copy is installed and the experimental package can't drift on its own (the same reason `drizzle` and `better-auth` are exact pins). Its `ioredis`/`@upstash/redis` peers are marked optional, so nothing extra is installed.
- *Alternative: upgrade to oRPC 2 beta for the stable `@orpc/publisher`.* Rejected: it's a framework-wide migration (contract, OpenAPI, client, TanStack Query) for one module.
- *Alternative: keep `EventPublisher` from `@orpc/server` with `maxBufferedEvents: Infinity`.* That fixes the drop, but leaves the hand-rolled `seq`/frame dedup and a less clean abort path. The user's direction is to delegate this plumbing to the library.

### 2. `jobs/events.ts`: one publisher per feature, typed per-run channels
```ts
type RunMessage = { event: RunEventRecord } | { end: LiveRunResult }
type JobEvents = { [channel: `run:${string}`]: RunMessage }
```
- One channel per run means a watcher only ever hears its own run, and a later run of the same job never reaches an old watcher.
- `subscribeRunMessages(runId, signal)` always passes `maxBufferedEvents: Number.POSITIVE_INFINITY`. The publisher's default is still 100, and dropping is what the spec forbids. Memory is bounded by the run's own events, which are already held in full in the replay buffer and in `completeRun`.
- The state lives on `globalThis.__jobEvents` (created once, reused on reload), so the scheduler's executor and new `watch` calls share a publisher across `bun --hot`.

### 3. `jobs/live.ts` keeps the replay buffer; the publisher carries live events only
Verified in 1.15.5: `MemoryPublisher.subscribeListener` registers its listener with no `await` before it, and `publish` delivers with no `await` before it, so both are effectively synchronous. `followLiveRun` therefore does:
1. `const live = subscribeRunMessages(run.id, signal)` (registered synchronously);
2. `const replay = run.events.slice()` and `const endedBefore = run.done` immediately after, with no `await`;
3. yield the replay; if `endedBefore`, return it;
4. `for await (const message of live)`: yield `message.event`, or return `message.end`.

Every event is either in the copy or queued in `live`, never both, so the `seq`/frame dedup goes away. The registry entry (`events`, `done`) and the `FINISHED_RUN_TTL_MS` deletion stay as they are; the exported functions keep their names and signatures (plus the optional `signal`), so `executor.ts` doesn't change. The `globalThis` treatment from decision 2 also applies to the registry map.
- *Alternative: publisher resume with a retention as long as `RUN_TIMEOUT_MS` and `lastEventId` from the start.* Rejected: event ids are generated by the publisher (`compareSequentialIds`), so there's no id meaning "from the beginning"; retention is time-based, not per run; and the "is this run live" check and the end marker would still be needed.

### 4. Watch handler takes the request `signal`
`jobRunsHandler.watch` becomes `async function* ({ context, input, signal }: { …; signal?: AbortSignal })` and the router forwards `signal` from oRPC's handler options. On abort, the publisher iterator rejects its pending pull with the abort reason; `followLiveRun` catches it when `signal.aborted` and returns normally, and its `finally` awaits `live.return()`. Without a signal, an abandoned generator suspended in `await live.next()` can't be returned until the run's next event, which during a silent task can be minutes. This narrowly extends the handler convention in AGENTS.md ("no other param shapes"): streaming handlers may also take `signal`. AGENTS.md is updated to say so, matching `stack`.

### 5. Frontend reattach: retry on transport errors, skip already-shown events
A pure helper in `apps/frontend/src/features/jobs/lib/run-watch-retry.ts`:
- `isTransportError(err)` is true for anything that isn't an `ORPCError`, and for `ORPCError`s with code `BAD_GATEWAY` / `SERVICE_UNAVAILABLE` / `GATEWAY_TIMEOUT` (proxy-generated; `jobs.runs.watch` itself never throws them).
- `reattachDelay(attempt)` returns 1 s, 2 s, 4 s, 8 s, 8 s. `MAX_REATTACH_ATTEMPTS = 5`; the attempt counter resets after an attempt receives an event.

`useJobRunWatch` keeps `phase: "running"` while reattaching and exposes a `reconnecting: boolean` that the run console shows as a short hint. On each new attempt it counts incoming events and drops the first `shownCount` (the replay repeats the run's events in the same order, exactly once), so the console doesn't flash or duplicate. The existing generation guard keeps `stopWatching`/`reset`/unmount authoritative over pending retries; retry timers are cleared in `detach`. A `null` result still settles to `"idle"`, which makes the page show the persisted run.
- *Alternative: `ClientRetryPlugin`.* Rejected: without publisher resume ids it re-calls `watch` and appends the full replay again, which duplicates events; it would also apply link-wide rather than to this one procedure.
- *Alternative: clear events and re-render the replay.* Simpler, but the console visibly empties and refills on every blip.

## Risks / Trade-offs

- **[Experimental package API changes]** → Exact pin; the surface used is small (`MemoryPublisher`, `publish`, `subscribe` with `signal`/`maxBufferedEvents`) and isolated in `jobs/events.ts`.
- **[The synchronous-registration invariant depends on library internals]** → A test publishes an event between `watchLiveRun()` starting and its first `next()` and asserts exactly-once delivery, so an upgrade that adds an `await` fails CI instead of silently duplicating or dropping events.
- **[Unbounded per-subscriber buffer]** → Bounded by the run's own event count, and released when the watcher leaves (signal) or the run ends.
- **[Bumping `@orpc/*` from 1.15.4 to 1.15.5 touches the whole stack]** → Patch release; `check-types`, unit tests and the E2E job-run flow cover it.
- **[Reattach replays the whole backlog over the wire]** → Acceptable for job runs (the same payload as a late attach today); only the client-side render is deduplicated.
- **[Overlap with the in-progress `add-endpoint-and-frontend-tests` change]** → Implement after that change is committed, and extend its `live.test.ts` rather than replacing it.

## Migration Plan

No data or contract migration. Deploy as a normal backend + frontend release. To roll back, revert the commit and restore the previous `@orpc/*` catalog entries in `bun.lock`.
