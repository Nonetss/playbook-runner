## Context

Every execution (interactive `run.*` streams and job runs) is a server-streaming `RunnerService` call from the backend (`@grpc/grpc-js` on Bun) to the Ansible service (`grpc.aio` in Python). By default the call goes through the gateway: `ANSIBLE_GRPC_TARGET` points to `gateway:50050` in Docker and `localhost:50050` in dev. There, Caddy proxies `/run.*` over h2c to `ansible:50051` with `flush_interval -1`. A run stream therefore crosses two HTTP/2 hops (backend → Caddy → Ansible). The direct hop (`localhost:50051`) is only used when native dev skips the gateway. The call's deadline is `RUN_TIMEOUT_MS` (1 h). Frames are emitted only when `ansible-runner` reports an event, so the stream goes silent for as long as a task runs: an `apt upgrade`, a `dnf update` or a slow script can leave it idle for many minutes. Before the run even starts, `RunBundle` can also spend up to `GIT_TIMEOUT_S` in `mirror.ensure_commit` without sending anything.

Neither side sets channel or server options today. `getClient` builds the client with no options, and `start_grpc_server` calls `grpc.aio.server()` with only the token interceptor. Runs that include a long silent task fail with `INTERNAL: Received RST_STREAM with code 2`, and `executor.ts` stores that as `gRPC INTERNAL: …`. `RST_STREAM` code 2 is what Go's HTTP/2 server, and therefore Caddy, sends to the backend when the proxied upstream stream breaks mid-response. So the reset may come from either hop: Bun's `node:http2` dropping a long idle stream, the Caddy → Ansible connection, or an idle timeout in between. The fix must not depend on which one it is, and it must work with and without the gateway.

## Goals / Non-Goals

**Goals:**
- A run that finishes within `RUN_TIMEOUT_MS` never fails just because a task was silent.
- The fix holds regardless of runtime (Bun or Node), proxies or Docker networking.
- No visible change for consumers. Heartbeats never reach the browser, the live-run registry or the database.
- When a stream is lost anyway, the error message tells the operator what happened.

**Non-Goals:**
- Reattaching to a run after the stream is lost (resumable runs). If the stream dies, Ansible is still cancelled, as today.
- Changing `RUN_TIMEOUT_MS` or the browser ↔ backend leg. oRPC's event-iterator keepalive already covers that leg.
- Replacing grpc-js or running the backend on Node.

## Decisions

### 1. Two layers: HTTP/2 keepalive plus application heartbeat

Keepalive pings alone keep the *connection* alive, but they don't put DATA frames on the *stream*. They don't help if Bun's http2 layer or something in between resets a stream that has been idle. A heartbeat frame does put data on the stream, so it doesn't matter which layer times out. Keepalive is still worth adding: it is nearly free and it detects a dead connection quickly instead of after the 1 h deadline. HTTP/2 PING frames are hop-by-hop, so they never cross Caddy. DATA frames do cross the proxy, which makes the heartbeat the only mechanism that covers both hops end to end.

Alternatives considered: only keepalive (cheap, but may not fix the Bun stream case), and only heartbeat (it fixes the reported failure, but dead TCP connections stay undetected until the deadline). Both layers together are cheap.

### 2. Keepalive settings

Client (`packages/grpc/src/client.ts`, passed as the third `Ctor` argument and applied to every cached client):
- `grpc.keepalive_time_ms: 30_000`
- `grpc.keepalive_timeout_ms: 10_000`
- `grpc.keepalive_permit_without_calls: 1`

Server (`python/grpc-toolkit/grpc_toolkit/server.py`, `options=` on `grpc.aio.server`):
- `grpc.keepalive_permit_without_calls: 1`
- `grpc.http2.min_recv_ping_interval_without_data_ms: 20_000`. It must be below the client's 30 s; the C-core default of 5 min would count every ping as a strike and end with `GOAWAY too_many_pings`.
- `grpc.http2.max_ping_strikes: 2` (explicit default).

Scope per hop: the client options cover backend → Caddy. Caddy's Go server answers pings without enforcing ping strikes, so they never trigger `too_many_pings` there. The server options only take effect on a hop that pings the Ansible service directly, which today means native dev with `ANSIBLE_GRPC_TARGET=localhost:50051`. Caddy's h2c transport doesn't send HTTP/2 pings upstream by default, so the Caddy → Ansible hop relies on TCP keepalive plus the heartbeat. The gateway needs no configuration change: `reverse_proxy` has no read/write timeouts by default, and `flush_interval -1` already forwards each heartbeat immediately.

The values are module constants with a comment on the client ↔ server coupling. They are not environment variables: nobody needs to tune them per deployment, and the server value is only correct relative to the client value.

### 3. Heartbeat as a `oneof` member

`proto/run.proto` gets `message Heartbeat {}` and `Heartbeat heartbeat = 4;` in each of the four run response `oneof payload` blocks. Each RPC already has its own response type (a Buf rule), so the field is repeated four times. An empty message, rather than a `bool`, keeps `oneof` presence unambiguous in ts-proto, where `heartbeat !== undefined` is true when the field is set.

Alternatives: sending an empty `TaskEvent` (overloads the meaning of `task`, and consumers would have to filter by content) or gRPC trailing metadata (not available mid-stream).

### 4. Heartbeats wrap the whole RPC, not only the runner

The Ansible service adds a helper in `app/grpc/services/runner.py`, `_with_heartbeats(frames, interval_s, heartbeat)`. It runs the RPC's real frame generator in a pump task that writes into an `asyncio.Queue`. The RPC side reads with `asyncio.wait_for(queue.get(), interval_s)` and yields `heartbeat()` on each timeout. The timer restarts after every real frame, so a busy run sends no heartbeats.

Each servicer method moves its current body into a private generator (`_run_bundle`, `_run_ping`, …) and becomes `async for frame in _with_heartbeats(...)`. The heartbeat therefore also covers `ensure_commit` and `materialize`.

Cancellation contract: when the outer generator is closed or cancelled (client cancel, deadline, shutdown), its `finally` cancels the pump task and awaits it. The `CancelledError` then lands inside the inner generator at its current `await`, so the existing `finally` chain still runs in order: stop `ansible-runner`, kill leftover processes, `cleanup`, release the slot. That chain completes before the RPC finishes, which keeps the "Run material is removed only after execution has stopped" requirement. Exceptions raised in the pump are re-raised on the RPC side, so `context.abort` (`RESOURCE_EXHAUSTED`) still behaves as it does today.

Rejected: `asyncio.wait_for(agen.__anext__(), …)`. A timeout cancels `__anext__` and would cancel the run. The rejected alternative of putting the timeout inside `AnsibleRunner.stream()` would not cover the git and materialize phases.

`run_heartbeat_interval_s: float = Field(default=15, gt=0)` is added to `Settings` (env `RUN_HEARTBEAT_INTERVAL_S`). 15 s is well under common idle timeouts (30–60 s) and costs about four tiny frames per minute.

### 5. Backend drops heartbeats at the two consumers

- `toEventIterator` (`packages/api/src/v1/run/proto.ts`) treats `evt.heartbeat` as `continue`. It comes before the `task`/`done`/`error` branches, and the existing "closed without a terminal frame" error still applies.
- `executeJob`'s frame loop (`packages/api/src/v1/jobs/executor.ts`) does the same, so heartbeats never reach `events`, `publishRunEvent` or `job_runs`.

### 6. Clear message on lost streams

A helper in `packages/api/src/v1/run/proto.ts`, `describeStreamError(err)`, returns `"Se perdió la conexión con el servicio de Ansible (gRPC <STATUS>: <details>); la ejecución pudo continuar o terminar en los hosts"` for `INTERNAL`, `UNAVAILABLE` and `CANCELLED`-by-transport. Other gRPC statuses keep the current `gRPC <STATUS>: <details>` format. The text is in Spanish, matching the executor's existing messages. It is used by:
- the executor's `catch`, which feeds the job run's `error`;
- `interactive()` in `stream-handler.ts`, which rethrows those statuses as `errors.BAD_GATEWAY({ message })` instead of letting oRPC turn them into a generic 500.

## Risks / Trade-offs

- [Bun's http2 may not implement `ping()` faithfully, so client keepalive could be a no-op or error out] → The heartbeat alone fixes the reported failure. If keepalive causes errors on Bun during verification, drop the client options and keep the heartbeat.
- [Old backend + new Ansible service, or the reverse, during a rolling deploy] → Unknown `oneof` fields are ignored by proto3 decoders on both sides, so an old backend sees a frame with no payload set. `toEventIterator` and the executor already skip such frames because none of their branches match. Compose deploys both together anyway.
- [Pump-task indirection changes cancellation ordering in the Ansible service] → The design keeps the existing `finally` chain inside the inner generator and awaits it on close. Tasks 5.2 (unit) and 6.3 (manual) verify that a cancel mid-run still deletes the run dir.
- [The gateway restarts or reloads during a run] → The stream is reset no matter what keepalive or heartbeat does. It is reported as a connection loss (decision 6) and the run is cancelled, as today. Making runs survive a proxy restart is out of scope (see Non-Goals).
- [A heartbeat proves the link is alive, not that Ansible makes progress] → Accepted. `RUN_TIMEOUT_MS` still bounds hung runs.

## Migration Plan

Deploy backend and Ansible images together (normal compose flow). No data migration. Rollback means redeploying the previous images; a stray heartbeat frame is harmless to the old code, as described above.

## Open Questions

- Should a run that lost its stream be marked with a distinct status (for example `lost`) instead of `failed`? Not in this change. It would need a schema change, which the user would have to make.
