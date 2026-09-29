## Context

Every execution follows the same path:

```
browser ──oRPC eventIterator──▶ backend (streamHandler / jobs executor)
                                   │ grpc-js ClientReadableStream (serverStream)
                                   ▼
                          ansible service RunnerServicer (grpc.aio async generator)
                                   │ AnsibleRunner.stream(): asyncio.to_thread(ansible_runner.run)
                                   ▼
                          ansible-runner worker thread ──SSH──▶ hosts
```

The audit found these problems along that path:

- **Cancellation breaks at two hops.**
  - `packages/grpc/src/client.ts` `serverStream()` returns the raw `ClientReadableStream` cast to `AsyncIterable`. When a consumer stops iterating, the Node `Readable` is destroyed but the gRPC call is never `.cancel()`ed, so the ansible side never learns about it.
  - On the Python side, `AnsibleRunner.stream()` calls `task.cancel()` on an `asyncio.to_thread` task. That task cannot interrupt the worker thread.
  - Meanwhile the servicer's `finally: cleanup(materialized)` removes the key files while the thread is still running Ansible.
- **Non-string event fields crash the stream.** `event_payload()` passes `res.msg`, `stdout` and `stderr` through unchanged, and `TaskEvent(**payload)` raises `TypeError` for lists and dicts.
- **The SSH user is overridden.** `_build_inventory()` correctly sets `ansible_user` per host from the credential. But `RunBundle`, `RunCommand` and `RunScript` also set `ansible_user` in extravars, which has the highest precedence, so every host uses `settings.ansible_user`.
- **Runs queue silently.** Runs occupy default-executor threads (`min(32, cpu+4)`), and excess runs wait without any feedback.
- **The return code is misreported.** `_stream_runner` reports `rc=runner.rc or 0`.
- **Job finalization is fragile.** `completeRun()` in `jobs/executor.ts` calls `finishLiveRun()` only after `await db.update(...)` succeeds.
- **A job can overlap itself.**
  - `Bun.cron` only prevents a scheduled job from overlapping *itself*.
  - `jobs.run` (manual) can overlap a scheduled run and vice versa.
  - The comment on `startRunResultSchema` describes a "lock acquire" that does not exist.
- **Input bounds are inconsistent.**
  - Cron expressions are only validated inside the scheduler, which silently skips invalid ones.
  - `forks` is unbounded for runs and jobs, and allows up to 500 for commands and scripts.

Constraints: no database schema changes or migrations. The proto stays wire-compatible. The backend runs on Bun, so `Bun.cron.parse` is available inside `packages/api`.

## Goals / Non-Goals

**Goals:**
- A run stops on the hosts whenever nobody is consuming it any more, and its secrets are removed only after it stops.
- A run never aborts because of the *shape* of a task's output.
- The connection identity for each host comes from its credential.
- The service applies explicit, observable backpressure instead of queuing silently.
- Every job run reaches a terminal state, and a job never runs concurrently with itself.

**Non-Goals:**
- Filtering or allow-listing user-supplied `extravars` (security hardening, owned by `harden-access-control`).
- TLS for gRPC and changes to Compose, ports or healthchecks (owned by `harden-access-control` and `fix-compose-deploy`).
- An explicit user-facing "Cancel run" button. The plumbing here enables one later, but the UI is out of scope.
- A persistent or distributed job lock across multiple backend replicas. The backend is single-process today.
- Refreshing the stale `/api/v0` wording in the existing execution specs.

## Decisions

### D1. Cancel in `serverStream`, centrally
`serverStream()` becomes an `async function*` wrapper:
- it iterates the `ClientReadableStream`;
- in `finally` it calls `stream.cancel()`, which is a no-op once the call has completed.

Every caller then gets cancel-on-early-exit for free:
- `streamHandler.*` through `yield*`: oRPC calls `.return()` on the handler's iterator when the HTTP request aborts, and `yield*` forwards it down to `serverStream`;
- `jobs/executor.ts` `for await`, on throw or deadline.

*Alternative:* have each caller hold the call object and cancel it. Rejected, because that duplicates the logic in 5 places and the next caller would forget it.

### D2. Cooperative cancel in Python via `cancel_callback` + `threading.Event`
When the client cancels, grpc.aio cancels the servicer's handler task. `CancelledError` is then raised at the `await queue.get()` inside `AnsibleRunner.stream()`.

In `stream()`'s `finally`:
1. set a per-run `threading.Event`, which is passed to ansible-runner as `cancel_callback=lambda: event.is_set()` (ansible-runner polls it and terminates the process tree);
2. `await asyncio.shield(task)` so the worker thread exits before the generator unwinds.

Because the servicer's `finally: cleanup(...)` runs after the generator's `finally`, cleanup is ordered after the thread exits.

*Alternative:* kill the process via `runner.canceled` or signals. Rejected, because `cancel_callback` is the supported API and it also covers the ad-hoc (`module=`) mode.

### D3. Dedicated bounded pool with fail-fast admission
- A module-level `ThreadPoolExecutor(max_workers=settings.max_concurrent_runs)` plus a matching slot counter (`asyncio.Semaphore`).
- Each servicer method tries to take a slot *before* materializing. If none is free, it calls `await context.abort(grpc.StatusCode.RESOURCE_EXHAUSTED, ...)`.
- The slot is released after the worker thread exits.
- `stream()` runs the job with `loop.run_in_executor(RUN_EXECUTOR, ...)` instead of `asyncio.to_thread`.
- The backend maps gRPC `RESOURCE_EXHAUSTED` to `errors.TOO_MANY_REQUESTS` in the interactive stream handler. Job executions record it as the run's error.

*Alternative:* queue with a timeout. Rejected, because interactive users are better served by an immediate, explicit error, and the scheduler already retries on its next tick.

Default is 8, set through the `MAX_CONCURRENT_RUNS` env var.

### D4. Normalize text fields at the payload boundary
`event_payload()` normalizes `msg`, `stdout` and `stderr` through `_as_text(v)`:
- `None` stays `None`;
- a `str` passes through unchanged;
- anything else becomes `json.dumps(v, default=str, ensure_ascii=False)`.

The proto stays `optional string`, so the frontend keeps rendering text.

*Alternative:* change the proto to `google.protobuf.Value`. Rejected, because it is wire-incompatible and gives little benefit for display-only fields.

### D5. Drop `ansible_user` from extravars; default only in inventory
- Remove `ansible_user` from the extravars in the three RPCs and from `AnsibleRunnerConfig`'s default `extravars`.
- `_build_inventory()` uses `host.username or settings.ansible_user`.
- `ansible_become_user` stays in extravars, because it is a global policy rather than per host.

### D6. Off-loop file I/O
`materialize`, `materialize_hosts`, `write_script_file` and `cleanup` are called via `await asyncio.to_thread(...)` from the servicer. They are short and bounded, so the default executor is fine and they do not consume run slots.

### D7. Terminal `rc`
`rc = runner.rc if runner.rc is not None else -1` and `ok = (rc == 0)`.

### D8. Job finalization in `finally`
`completeRun()` is restructured:
- the `db.update` goes in `try`;
- on failure, log it and make one best-effort retry with the minimal update `{status: "failed", error, finishedAt}`;
- `finishLiveRun(...)` always runs in `finally`, reporting `failed` if persisting failed.

`recoverOrphanedRuns()` at the next boot remains the backstop.

### D9. Non-overlap via advisory lock around check-and-insert
`openRun()` runs in a `db.transaction`:
1. `SELECT pg_advisory_xact_lock(hashtext(${jobId}))`;
2. check for an existing `job_runs` row with `status = 'running'` for the job;
3. if there is one, return `{ conflict: true }`; otherwise insert the `running` row.

The lock is released at commit. After that the `running` row itself is the mutual-exclusion marker, and `completeRun` or `recoverOrphanedRuns` always clears it.

Results by caller:
- `startJobRun` → `jobs.run` throws `errors.CONFLICT()`;
- `executeJob` (scheduler) logs and returns `null`;
- a missing job still maps to `NOT_FOUND`.

The misleading comment on `startRunResultSchema` is removed.

*Alternatives:*
- A partial unique index on `(job_id) WHERE status='running'`. Rejected because it needs a migration.
- An in-memory `Set`. Rejected because it gives the wrong answer on the first run after a restart and does not survive a second replica.

### D10. Input bounds
- `forks: z.number().int().min(1).max(50)` in `run/stream-input.ts` (run, command, script) and in the job input schema the router actually uses.
- A shared `isValidCron(pattern)` helper (`Bun.cron.parse` in try/catch) lives in `packages/api/src/v1/jobs/cron.ts`. It is used by a zod `refine` on `cronExpression` (null or empty means manual-only) and by `apps/backend/src/jobs/scheduler.ts` in place of its private `isValidPattern`.

### D11. Shutdown grace
`grpc_server.stop(grace=settings.grpc_shutdown_grace_s)`, default 8 s, which keeps it below Docker's default 10 s stop timeout. Cancelled RPCs then run the D2 path (cancel → wait for the thread → cleanup).

## Risks / Trade-offs

- **ansible-runner polls `cancel_callback` periodically, so stopping is not instant.** The worker may take a moment to exit, and a slow SSH teardown could exceed the shutdown grace. → Mitigation: set a bounded `asyncio.wait_for` around the shielded wait (for example 30 s at runtime, capped by the grace at shutdown), then log and proceed to cleanup.
- **Existing jobs with `forks > 50` fail validation on their next update.** → Mitigation: the UI surfaces the validation error. Operators must lower the value, and saved jobs still run. No data migration is needed because runtime is not capped, only input.
- **`RESOURCE_EXHAUSTED` is a new error users can see.** → Mitigation: map it to a clear message ("too many concurrent runs, try again") and make the limit configurable.
- **The advisory lock hash can collide.** `hashtext` on two different job ids can map to the same key and briefly serialize their check-and-insert. That only delays one of them, it does not refuse it, so it is acceptable.
- **The `serverStream` return type changes** from `AsyncIterable` to `AsyncGenerator`. That is a superset, so callers compile unchanged.

## Migration Plan

- Ship the backend and the Ansible service together. The proto is unchanged, so either can deploy first without breaking:
  - an old backend against a new service still works, it just does not cancel;
  - a new backend against an old service cancels the call, but the old service still leaks the run, so behaviour is no worse than today.
- New optional env vars: `MAX_CONCURRENT_RUNS`, `GRPC_SHUTDOWN_GRACE_S`. They should be documented in AGENTS.md (no `apps/ansible/.env.example` exists today).
- Rollback: revert the commits. There is no persisted state to undo.

## Open Questions

- Should `MAX_CONCURRENT_RUNS` default to 8, or be derived from CPU count? 8 is proposed because runs are I/O-bound SSH sessions, not CPU work.
- Should pings bypass the concurrency limit? They are short and interactive. The proposal counts them, to keep the limit a true upper bound on concurrent Ansible processes.
