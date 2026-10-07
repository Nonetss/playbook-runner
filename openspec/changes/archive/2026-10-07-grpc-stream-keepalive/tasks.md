## 1. Protocol

- [x] 1.1 Add `message Heartbeat {}` to `proto/run.proto` and a `Heartbeat heartbeat = 4;` member to the `oneof payload` of `RunBundleResponse`, `RunPingResponse`, `RunCommandResponse` and `RunScriptResponse`, with a comment saying it is transport-only
- [x] 1.2 Regenerate stubs (`bun run --filter @playbook-runner/grpc generate-grpc` and the `apps/ansible` `generate-grpc` script), then export `Heartbeat` from `apps/ansible/app/grpc/stubs.py` and from the `@playbook-runner/grpc` stubs barrel

## 2. Transport keepalive

- [x] 2.1 In `packages/grpc/src/client.ts`, pass keepalive channel options (`grpc.keepalive_time_ms: 30_000`, `grpc.keepalive_timeout_ms: 10_000`, `grpc.keepalive_permit_without_calls: 1`) as named constants to every client `getClient` creates, with a comment on the coupling with the server's minimum ping interval
- [x] 2.2 In `python/grpc-toolkit/grpc_toolkit/server.py`, pass `options=` to `grpc.aio.server` (`grpc.keepalive_permit_without_calls: 1`, `grpc.http2.min_recv_ping_interval_without_data_ms: 20_000`, `grpc.http2.max_ping_strikes: 2`) as named constants

## 3. Ansible service heartbeats

- [x] 3.1 Add `run_heartbeat_interval_s: float = Field(default=15, gt=0)` to `apps/ansible/app/core/config.py` with a comment
- [x] 3.2 Implement `_with_heartbeats(frames, interval_s, heartbeat)` in `apps/ansible/app/grpc/services/runner.py`. It pumps the inner generator into a queue from a task, yields `heartbeat()` after `interval_s` without a frame, re-raises inner exceptions (including `context.abort`), and on close/cancel cancels and awaits the pump so the inner `finally` chain (runner stop → cleanup → slot release) completes first
- [x] 3.3 Move the bodies of `RunBundle`, `RunPing`, `RunCommand` and `RunScript` into private generators and wrap each with `_with_heartbeats(..., settings.run_heartbeat_interval_s, lambda: <Response>(heartbeat=Heartbeat()))`, so the git `ensure_commit` and materialize phases are covered too

## 4. Backend consumers

- [x] 4.1 In `packages/api/src/v1/run/proto.ts`, make `toEventIterator` skip frames with `heartbeat` set (and keep skipping frames with no payload), and add `describeStreamError(err)`, which returns the "Se perdió la conexión con el servicio de Ansible…" message for `INTERNAL`/`UNAVAILABLE`/`CANCELLED` and `gRPC <STATUS>: <details>` otherwise
- [x] 4.2 In `packages/api/src/v1/jobs/executor.ts`, skip `heartbeat` frames in the frame loop (never pushed to `events` or `publishRunEvent`) and use `describeStreamError` in the `catch`
- [x] 4.3 In `packages/api/src/v1/run/stream-handler.ts`, make `interactive()` rethrow transport-loss gRPC errors as `errors.BAD_GATEWAY({ message: describeStreamError(err) })`, keeping the `RESOURCE_EXHAUSTED` → `TOO_MANY_REQUESTS` mapping
- [x] 4.4 Document `RUN_HEARTBEAT_INTERVAL_S` and the keepalive/heartbeat behaviour in the "Env & runtime gotchas" section of `AGENTS.md`, noting that HTTP/2 pings stop at the gateway and only heartbeats cross it

## 5. Unit tests

- [x] 5.1 In `packages/api/tests/v1/run/proto.test.ts`, cover `toEventIterator` skipping `heartbeat` frames between task events (records and terminal `Done` unchanged), and `describeStreamError` for `INTERNAL`/`UNAVAILABLE` (connection-loss message including the status) versus another status (plain `gRPC <STATUS>: <details>`)
- [x] 5.2 Add `apps/ansible/tests/test_heartbeats.py` for `_with_heartbeats` (driven with `asyncio.run` and small fake generators, short interval): it yields a heartbeat during silence, yields none while frames arrive faster than the interval, re-raises an exception from the inner generator, and on `aclose()`/cancel runs the inner generator's `finally` before returning

## 6. Verification

- [x] 6.1 Run `bun run check-types` (TypeScript, astro check, BasedPyright), `bunx biome ci .`, Ruff on the Python changes, and `bun run test`
- [x] 6.2 Manual check through the gateway (default `ANSIBLE_GRPC_TARGET=…:50050`), and once directly against `:50051`: run a playbook or command with a silent task longer than the old failure window (e.g. `sleep 600`). It must finish with its real status, and the browser console and job run events must contain no heartbeat entries
- [x] 6.3 Manual check: cancel a run mid-`sleep` (close the tab or stop it). The Ansible log must show the run cancelled, leftover processes killed and the run dir deleted
- [x] 6.4 Manual check: start a run with all `MAX_CONCURRENT_RUNS` slots taken. It must still fail fast with `TOO_MANY_REQUESTS`
