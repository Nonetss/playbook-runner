## 1. Ansible service: serialization, rc, SSH user

- [x] 1.1 Add `_as_text()` in `apps/ansible/app/services/ansible/sse.py` and apply it to `msg`, `stdout`, `stderr` in `event_payload()` (None → None, str unchanged, else `json.dumps(..., default=str, ensure_ascii=False)`)
- [x] 1.2 In `apps/ansible/app/grpc/services/runner.py` `_stream_runner`, report `rc = runner.rc if runner.rc is not None else -1` and `ok = rc == 0`
- [x] 1.3 Remove `ansible_user` from the extravars built in `RunBundle`, `RunCommand`, `RunScript` and from `AnsibleRunnerConfig`'s default `extravars` (keep `ansible_become_user`)
- [x] 1.4 In `materialize.py` `_build_inventory()`, set `ansible_user` to `host.username or settings.ansible_user`

## 2. Ansible service: bounded pool, cooperative cancel, off-loop I/O

- [x] 2.1 Add `max_concurrent_runs: int = 8` and `grpc_shutdown_grace_s: float = 8` to `apps/ansible/app/core/config.py`; document both in AGENTS.md (there is no `apps/ansible/.env.example`; add one if desired)
- [x] 2.2 Create a module-level `ThreadPoolExecutor(max_workers=settings.max_concurrent_runs)` and a matching admission `asyncio.Semaphore`
- [x] 2.3 Rework `AnsibleRunner.stream()`:
  - run `ansible_runner.run` via `loop.run_in_executor(RUN_EXECUTOR, ...)`;
  - pass `cancel_callback` bound to a per-run `threading.Event`;
  - in `finally`, set the event and `await asyncio.shield(task)` (bounded by `wait_for`, log on timeout).
- [x] 2.4 In each servicer method, acquire a run slot before materializing:
  - if none is free, `await context.abort(grpc.StatusCode.RESOURCE_EXHAUSTED, ...)`;
  - release the slot in `finally` after the stream has fully unwound.
- [x] 2.5 Call `materialize`, `materialize_hosts`, `write_script_file` and `cleanup` via `await asyncio.to_thread(...)` in the servicer; keep `cleanup` in `finally` after the generator unwinds
- [x] 2.6 Replace `grpc_server.stop(grace=1)` in `apps/ansible/app/main.py` with `settings.grpc_shutdown_grace_s`
- [x] 2.7 Run `bun run check-types` (BasedPyright) and `bun run format`

## 3. Backend: cancellation and error mapping

- [x] 3.1 Rewrite `serverStream()` in `packages/grpc/src/client.ts` as an async generator that yields from the call and calls `stream.cancel()` in `finally`; update its doc comment
- [x] 3.2 Confirm `streamHandler.*` (`packages/api/src/v1/run/stream-handler.ts`) propagate `.return()` to `serverStream` via `yield*` (no code change expected; add a short comment)
- [x] 3.3 Map gRPC `RESOURCE_EXHAUSTED` to `errors.TOO_MANY_REQUESTS()` for interactive streams (wrap the iteration in `toEventIterator` or the stream handler with `isGrpcError`)

## 4. Backend: job runs

- [x] 4.1 Restructure `completeRun()` in `packages/api/src/v1/jobs/executor.ts`:
  - `db.update` in `try`;
  - on failure, log and make one best-effort minimal update to `failed`;
  - `finishLiveRun` always in `finally`, with the correct status.
- [x] 4.2 Rewrite `openRun()` to run inside `db.transaction`:
  - take `pg_advisory_xact_lock(hashtext(jobId))`;
  - check for an existing `running` run of the job and return a conflict result if there is one;
  - otherwise insert the new run.
- [x] 4.3 Make `startJobRun` / `jobs.run` throw `errors.CONFLICT()` on conflict and `errors.NOT_FOUND()` when the job is missing; make `executeJob` (scheduler) log and skip on conflict
- [x] 4.4 Remove the misleading "lock acquire" comment on `startRunResultSchema` in `jobs/router.ts`

## 5. Backend: input bounds

- [x] 5.1 Add `packages/api/src/v1/jobs/cron.ts` exporting `isValidCron(pattern)` (`Bun.cron.parse` in try/catch)
- [x] 5.2 Add a zod `refine` on `cronExpression` (null or empty allowed) to the job input schema used by `jobs.create` / `jobs.update`, returning `BAD_REQUEST` with a clear message
- [x] 5.3 Replace `isValidPattern` in `apps/backend/src/jobs/scheduler.ts` with `isValidCron`
- [x] 5.4 Cap `forks` at `.max(50)` in `run/stream-input.ts` (run, command, script) and in the job input schema

## 6. Verification

- [x] 6.1 `bun run check-types` and `bun run check` pass
- [ ] 6.2 Manual check: start a long playbook (for example `pause: minutes=2`) from the UI and close the tab. Ansible logs show a cancel, the process stops, and the run's scratch dir is removed only after the worker exits.
- [ ] 6.3 Manual check: a playbook with `debug: msg: [1, 2]` streams the JSON-encoded msg and completes with a `done` frame
- [ ] 6.4 Manual check: two devices with credentials using different usernames each connect as their own user
- [ ] 6.5 Manual check: set `MAX_CONCURRENT_RUNS=1`, start two runs, and confirm the second fails fast with `TOO_MANY_REQUESTS`
- [ ] 6.6 Manual check: `jobs.run` twice in a row on a long job; the second returns `CONFLICT`
- [x] 6.7 Manual check: `jobs.create` with an invalid cron or with `forks: 51` returns `BAD_REQUEST`
