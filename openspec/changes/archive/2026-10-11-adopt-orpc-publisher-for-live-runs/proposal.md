## Why

The live-run registry behind `jobs.runs.watch` (`packages/api/src/v1/jobs/live.ts`) hand-rolls pub/sub on top of `@orpc/server`'s `EventPublisher` with its own sequence numbers, frame types and cleanup timer. That `EventPublisher` keeps at most 100 buffered events per subscriber by default and silently drops the oldest beyond that, so a watcher that reads slower than a verbose playbook produces events loses part of the run without any signal. The registry also lives in module scope, so a `bun --hot` reload in dev leaves the scheduler publishing into one map while new `watch` calls read another. A watcher whose connection drops ends in an error state, even though the run keeps going and could be reattached. Rather than keep patching custom stream plumbing, delegate subscription, buffering and delivery to oRPC's publisher library, following the pattern already proven in the sibling `stack` project (`events.ts` per feature + a run registry that owns only the replay buffer).

## What Changes

- Add `@orpc/experimental-publisher` (oRPC v1 line, exact pin in the root catalog) and align every `@orpc/*` catalog entry to the same exact version, so a single `@orpc/shared` copy is installed.
- New `packages/api/src/v1/jobs/events.ts`: one `MemoryPublisher` for the jobs feature with a typed channel per run (`run:<runId>`) carrying either a run event or an end marker with the terminal result; subscriptions never drop events (`maxBufferedEvents: Infinity`); state kept on `globalThis` so `bun --hot` reuses it.
- Rewrite `packages/api/src/v1/jobs/live.ts` as a run registry that owns only what the library doesn't: the per-run replay buffer, the terminal result, the "is this run live" lookup and the short post-finish retention. Watching subscribes synchronously and copies the buffer right after (no `await` in between), so each event is delivered exactly once whether it was in the backlog or arrived live. Public functions (`beginLiveRun`, `publishRunEvent`, `finishLiveRun`, `watchLiveRun`) and the `jobs.runs.watch` contract stay the same.
- A watcher that leaves (client disconnect / abort signal) ends its own subscription cleanly without affecting the run or other watchers; `jobs.runs.watch` forwards the procedure's `signal`.
- Frontend `useJobRunWatch` reattaches automatically when the watch stream fails for a transport reason (network drop, proxy reset) while the run may still be live: it calls `jobs.runs.watch` again with bounded backoff and replaces its events with the replay, so the console resumes without duplicates. Application errors (`ORPCError`, e.g. `UNAUTHORIZED`) still end in the error state; a `null` result still falls back to the persisted run.

Not in scope: resuming interactive streams (`run.run`, `run.script`, `run.command`, `run.ping`). They stay bound to the request, and closing them still cancels the Ansible execution; making them detachable is a separate change. The publisher's own resume feature (`resumeRetentionSeconds` / `lastEventId`) is not used: replay from the start for late watchers stays in the registry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `run-lifecycle`: adds requirements for watching a live job run — every event delivered exactly once to each watcher regardless of when it attaches or how slowly it reads, a leaving watcher not affecting the run, and the job run console reattaching after a lost connection. The existing "Job runs always finalize" requirement is unchanged.

## Impact

- `package.json` (root catalog): `@orpc/*` pinned to one exact version, new `@orpc/experimental-publisher`; `bun.lock` updated by `bun install`.
- `packages/api/package.json`: new dependency `@orpc/experimental-publisher`.
- `packages/api/src/v1/jobs/events.ts` (new), `packages/api/src/v1/jobs/live.ts` (rewritten), `packages/api/src/v1/jobs/handler.ts` (`watch` passes `signal`).
- `packages/api/src/v1/jobs/executor.ts`: no behavioural change expected (keeps calling the registry).
- `apps/frontend/src/features/jobs/hooks/use-jobs.ts` (`useJobRunWatch` reattach); possibly a "reconnecting" hint in the job run console copy (`locales/{en,es}`).
- Tests: `packages/api/tests/v1/jobs/live.test.ts` (currently untracked, part of the in-progress `add-endpoint-and-frontend-tests` change) extended with no-drop, exactly-once and abort cases; a frontend unit test for the reattach decision if it is extracted as a pure helper.
- No API contract, database, migration, gateway or Ansible service changes.
