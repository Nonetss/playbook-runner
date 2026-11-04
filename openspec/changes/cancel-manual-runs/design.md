## Context

See `proposal.md` for motivation and `specs/` for the behavior contract.

The Ansible service already handles a cancelled gRPC call: `AnsibleRunner.stream` sets the cancel callback, waits up to `CANCEL_WAIT_S` (30 s), kills leftover worker processes by `private_data_dir`, and only then are the key files removed. So the whole change sits in the backend and the frontend.

There are two kinds of manual run, with different owners:

- **Interactive** (`run.run`): owned by the browser's stream. No row, no registry entry. `serverStream`'s `finally` cancels the call when the generator is closed.
- **Job "run now"** (`completeRun`): owned by a background promise, detached from any request, with a `job_runs` row and an entry in the in-memory live registry (`jobs/live.ts`). Watchers come and go without affecting it.

The shared weakness is how the backend notices a stop. `.return()` on an async generator suspended at an `await` is queued until the generator next reaches a `yield`. `toEventIterator` and `streamRun` both `continue` on heartbeats without yielding, so a return issued during a silent task looks stuck until the next real event. The same issue was already solved for watchers with a `signal` (commit `f6a7a48`). This is inferred from the code and generator semantics, not reproduced; task 2.1 does that first.

## Goals / Non-Goals

**Goals:**

- Cancel both kinds of manual run, immediately, including during a silent task.
- Keep the report honest: a cancelled job run is not a failure and not a lost connection.

**Non-Goals:**

- Cancelling scheduled runs. The refusal is a single check in the handler, so allowing them later is a small change.
- A cancel button for commands, scripts and ping. They get the faster stop from `signal`, and their "Stop watching" copy is left for a follow-up.
- Rollback, or stopping a command already launched on a remote host.
- Working across several backend processes: the registry is already single-process.
- A "cancelling" status visible to other users or stored in the row.

## Decisions

### `serverStream` takes an `AbortSignal`

`serverStream(call, request, { token, timeoutMs, signal })`: if the signal is already aborted it does not open the call; otherwise an abort listener calls `stream.cancel()` directly, and the listener is removed in `finally`. Cancelling the stream makes the pending read reject with `CANCELLED`, which unblocks the generator whatever it was waiting for.

- *Alternative: make `toEventIterator` yield on heartbeats.* Rejected: heartbeats must stay invisible to callers, and it would still wait up to `RUN_HEARTBEAT_INTERVAL_S`.
- *Alternative: use grpc-js call options.* Rejected: `stream.cancel()` is already the mechanism here.

### Interactive runs cancel by closing the stream

The four `run` procedures forward oRPC's `signal` to their handlers, as the event-iterator exception in the layering rules allows, and on to `serverStream`. There is no cancel endpoint: `stopWatching` already closes the stream, so the button only needs a confirmation and honest copy. `interactive()` rethrows without mapping to `BAD_GATEWAY` when the signal is aborted, since nobody is listening and it is not a connection failure.

- *Alternative: a run registry and endpoint for interactive runs, so the browser gets a confirmed end.* Rejected: it adds server state for runs that are deliberately stateless, only to confirm something the copy can state honestly.

Consequence: the browser cannot confirm that Ansible has stopped, so the copy says the cancellation was sent.

### Job runs cancel through the live registry

`LiveRun` gains an `AbortController` and `cancelledBy: string | null`. `beginLiveRun` creates and returns the signal; `completeRun` passes it to `streamRun` and on to `serverStream`. `cancelLiveRun(runId, userName)` returns `false` when there is no unfinished entry, aborts, and keeps the first `cancelledBy`.

`jobRunsHandler.cancel` decides in this order: row missing → `NOT_FOUND`; `trigger = 'schedule'` → `FORBIDDEN`; status not `running` or `cancelLiveRun` false → `CONFLICT`. Output is `{ runId }`; the outcome arrives through the existing `watch` and `watchChanges` streams.

Registry access stays in `jobs/live.ts` (plain functions, usable outside a request); the handler only calls it.

### Who cancelled lives in `error`

The row's `error` holds "Cancelada por <name>", with no new column. The value is not used for logic, and `selectedRun.error` already reaches the job detail page. The name is captured when cancelling, so a later rename does not change it.

- *Alternative: a `cancelled_by` column.* Rejected: a second schema change for a value nothing queries.

### Deciding `cancelled` in the executor

`RunOutcome` gains `cancelled: boolean`, set only by the `catch` in `streamRun` when `signal.aborted`, checked before `describeStreamError`. A stream that delivered its terminal frame never reaches that branch, so the real outcome wins the race. `completeRun` maps `cancelled` to the status and keeps it in the minimal retry when persisting fails, so a cancelled run is not stored as `failed` by that path.

### `cancelled` as an enum value, not part of `partial`

`runOutcome` returns `cancelled` before computing `partial`, because the recap of a cancelled run says nothing about the failure of its hosts. `RUN_OUTCOME_TONE.cancelled` is `muted`, so the type-checked `Record` covers the feed, dashboard and job list at once.

Success rates: `metrics` and rollups filter out `cancelled` from the denominator; `total` keeps counting them. A user who stops a mistaken run should not see the reliability of the job drop.

### The frontend must not overwrite a finished run

`stopWatching` guards on `phase`, but the page awaits a confirmation before calling it, so the closure can hold a stale `running`. `useRunStream` and `useJobRunWatch` decide inside a functional `setPhase`, so they see the current phase without a ref. A run that finished during the dialog keeps its result.

### Job detail UI

- A `useCancelJobRun` mutation in `features/jobs/hooks/use-jobs.ts`. `job-detail-page` holds `cancellingRunId`, cleared when that run stops being `running` or the call fails.
- "Cancel run" lives in the page's hero actions, not in the live status banner: that banner is gone once the user stops watching or the watch fails, and the run can still be cancelled then. `RunStreamStatus` needs no change.
- `RunResultBanner` accepts an optional `tone`, used for `cancelled`. The persisted error banner uses the `changed` tone on a cancelled run. The result message uses a dedicated key instead of interpolating the raw status.

## Risks / Trade-offs

- [The backend settles a run as soon as the call is cancelled, up to 30 s before Ansible has actually stopped, so a new run of that job can overlap the dying one on the same hosts] → Accepted: the runner still holds the old slot, the window is short, and waiting would need a new RPC. Documented in `docs/`.
- [A command already launched on a host may keep running after its `ssh` dies] → Cannot be solved from here. Stated in the confirmation and the docs.
- [Cancelling leaves hosts half-configured] → Stated in the confirmation; there is no rollback.
- [The `signal` depends on the abort reaching the backend through the gateway and the Vite proxy] → The watchers already rely on it; task 7.1 verifies it end to end.
- [`serverStream` has no unit tests: the API test setup replaces it and `packages/grpc` has no test task] → API tests assert the `signal` is forwarded and how consumers react; the real helper is covered by the manual check in 7.1.
- [`cancelledBy` is lost if the backend restarts mid-run] → `recoverOrphanedRuns` marks the row `failed` as it does today; the cancellation is moot since the process that held the call died.
- [API consumers with an exhaustive status check will meet a new value] → Marked as breaking in the proposal. The project has no versioning promise beyond `v1`, and the only known consumer is the frontend.

## Migration Plan

1. Agent edits `packages/db/src/schema/jobs.ts`, adding `cancelled` to the enum, as the user chose. **It does not generate, run or edit any migration.**
2. The user generates and applies the migration (`ALTER TYPE … ADD VALUE`).
3. Deploy order: migration first, then the backend. A new backend on the old enum would fail when storing a cancelled run. The old backend ignores the new value safely.
4. Rollback: redeploy the previous backend and frontend. PostgreSQL cannot drop an enum value simply, so it stays, and existing `cancelled` rows would fail output validation on the old backend until they are updated to `failed` by hand.
