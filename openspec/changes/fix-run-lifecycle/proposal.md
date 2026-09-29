## Why

An audit of the execution path from the browser through the backend to the Ansible runner found several lifecycle bugs. Runs keep executing on real hosts after the user disconnects or times out, and their SSH key files are deleted while they are still running. A single task that returns a list or dict `msg` aborts the stream. Every run connects as one global SSH user, ignoring each credential's username. A failed database write can leave job watchers hanging forever. The same job can also run twice at once. Together these make execution unreliable and, in the cancellation case, unsafe, and they need fixing before more automation is built on top.

## What Changes

- **End-to-end cancellation.**
  - The backend holds the gRPC `ClientReadableStream` for every run (interactive `run.*` streams and job executions) and calls `.cancel()` when the consumer stops iterating, whether through disconnect, error, timeout or early return.
  - The Ansible service turns a cancelled RPC into an `ansible_runner` `cancel_callback` (backed by a `threading.Event`). It waits for the worker thread to exit before it removes the run directory, so key files are never deleted under a live run.
- **Robust event serialization.** Non-string `msg`, `stdout` and `stderr` values are JSON-encoded before they are put into the proto `string` fields, instead of raising `TypeError` and killing the stream.
- **Per-host SSH user is honored.**
  - The runner no longer injects `ansible_user` as an extra var. Extra vars take the highest precedence, so injecting it overrode the per-host `ansible_user` taken from each device's credential.
  - `settings.ansible_user` remains only as a fallback for hosts that arrive without a username.
- **Bounded run concurrency.**
  - Runs execute on a dedicated `ThreadPoolExecutor` sized by a new `MAX_CONCURRENT_RUNS` setting.
  - A request that finds every slot busy is rejected immediately with `RESOURCE_EXHAUSTED` instead of queuing silently.
- **Non-blocking I/O.** Materialization and cleanup of run directories run off the event loop via `asyncio.to_thread`.
- **Honest terminal frame.** `Done.rc` is `-1` when ansible-runner reports no return code, instead of `0`.
- **Job completion always finalizes.** `completeRun` calls `finishLiveRun` in a `finally`. If persisting the outcome fails, it makes a best-effort attempt to mark the run `failed`. Watchers always receive a terminal frame and the live-registry entry is always released.
- **No overlapping runs of the same job.** Starting a job that already has a `running` run is refused. A manual start returns `CONFLICT`, and a scheduled tick skips and logs. This is enforced with a PostgreSQL transaction-scoped advisory lock and needs no schema change. The misleading "lock acquire" comment is removed.
- **Input bounds.**
  - Cron expressions are validated on job create and update and return `BAD_REQUEST` when invalid, instead of being skipped silently by the scheduler.
  - `forks` is capped at 50 for playbook runs, commands, scripts and jobs. **BREAKING**: requests with `forks` above 50 that were previously accepted (commands and scripts allowed up to 500, runs and jobs were unbounded) are now rejected.
- **Graceful shutdown.** The Ansible gRPC server gets a longer shutdown grace so in-flight runs can be cancelled and cleaned up.

## Capabilities

### New Capabilities
- `run-lifecycle`: Cross-cutting guarantees for every execution (playbook, command, script, ping, job):
  - cancellation propagation and safe cleanup
  - event serialization
  - per-host connection identity
  - concurrency limits
  - terminal-frame semantics
  - job run finalization and non-overlap
  - execution input bounds

### Modified Capabilities
<!-- None. The existing execution specs (playbook-execution, remote-command-execution, bash-script-execution) still describe the removed `/api/v0` HTTP+SSE endpoints; refreshing them is out of scope here and tracked by the cleanup-conventions-docs change. -->

## Impact

- **Backend / API:**
  - `packages/grpc/src/client.ts`: `serverStream` exposes cancel-on-return semantics.
  - `packages/api/src/v1/run/proto.ts`, `run/stream-handler.ts`, `run/stream-input.ts`
  - `packages/api/src/v1/jobs/executor.ts`, `jobs/router.ts`, `jobs/input.ts`
  - `apps/backend/src/jobs/scheduler.ts`
- **Ansible service:**
  - `apps/ansible/app/grpc/services/runner.py`
  - `apps/ansible/app/services/ansible/runner.py`, `sse.py`, `materialize.py`
  - `apps/ansible/app/core/config.py`
  - `apps/ansible/app/main.py`
- **Wire and API behaviour:**
  - The proto is unchanged.
  - A new gRPC status is now surfaced (`RESOURCE_EXHAUSTED`) and mapped to an oRPC error.
  - `jobs.run` can now return `CONFLICT`.
  - `forks` upper bound: see the **BREAKING** note above.
- **Config:** new optional Ansible env var `MAX_CONCURRENT_RUNS` (default 8).
- **No database schema or migration changes.**
