## Context

The stack has three pieces: a **frontend**, a **backend** (`apps/backend`, Hono + oRPC + Drizzle, auth via Better Auth), and a **Python Ansible microservice** (`apps/ansible`, FastAPI + `ansible-runner`). Persistent data lives in Postgres and is owned by the backend through the `@none.stack/db` Drizzle schema and the `@none.stack/api` oRPC handlers.

Today the Ansible service can run a single hardcoded playbook (`/api/v0/ping`) and stream events over SSE using `app/services/ansible/runner.py` + `events.py`. The `/api/v0/run` endpoint is a stub returning `{status, result}`. The service already authenticates by forwarding the caller's session cookie to the backend (`app/api/deps.py::get_current_user`).

Relevant data:
- `playbooks(id uuid, name, content text, …)` — the playbook YAML lives in `content`.
- `inventory_devices(id uuid, name, ip_address cidr, port_ssh?, credential_id uuid → credentials)`.
- `inventory_groups(id uuid, …)` and `inventory_device_groups(device_id, group_id)` join table.
- `credentials(id uuid, name, username, private_key text, public_key text)`.

The run request shape already declared in `run.py` is `{ playbookId: uuid, inventoryIds: [{ id: uuid, type: "group"|"device" }] }`.

## Goals / Non-Goals

**Goals:**
- Implement `POST /api/v0/run` end-to-end: resolve → materialize → execute → stream.
- Keep the database as a single source of truth owned by the backend; the Python service does not open its own DB connection.
- Resolve the full run bundle (playbook content + de-duplicated hosts + credentials) in **one** backend round-trip.
- Reuse the existing `AnsibleRunner`/SSE plumbing so `/run` behaves like `/ping`.

**Non-Goals:**
- Persisting run history/results (no new tables, no audit log).
- Run cancellation, queuing, or concurrency limits.
- Per-user authorization rules beyond "must be an authenticated session" (matches current `protectedProcedure`).
- Frontend wiring (separate change).

## Decisions

### Decision 1: Resolve via a dedicated backend RPC procedure (not direct DB access)
The Ansible service calls a new authenticated oRPC procedure (e.g. `run.resolve`) that takes `{ playbookId, inventory: [{id, type}] }` and returns the playbook `content` plus a de-duplicated host list with credentials.

**Why over direct DB access from Python:**
- Drizzle schema + handlers remain the single source of truth; no duplicated schema/connection/migration coupling in Python.
- The group→device→credential expansion (join across 4 tables, de-dup) is done once, server-side, where the relations already live — avoiding N+1 HTTP calls against the granular existing list/get procedures.
- The service is already coupled to the backend for auth and already forwards the session cookie via `httpx`; this reuses that exact path.

**Why over reusing the existing granular procedures (`devices.list`, `credentials.get`, …):** would require multiple calls and client-side joining of sensitive data; a purpose-built resolver is simpler and keeps secrets handling in one place.

**Trade-off:** private keys must be returned over the internal HTTP hop. Acceptable because the credentials RPC layer already exposes `privateKey`, and both services are internal/trusted; the call is authenticated by forwarding the user's session cookie.

### Decision 2: Resolved bundle shape
`run.resolve` returns:
```
{
  playbook: { name: string, content: string },
  hosts: [
    { name, address, port?, username, privateKey, connection: "ssh" }
  ]
}
```
- Groups in the selection are expanded to their member devices via `inventory_device_groups`; devices are merged with directly-selected devices and de-duplicated by device id.
- `address` is derived from `ip_address` (cidr → host address string).
- Devices with no `credential_id` are surfaced as an error (cannot SSH without a credential) rather than silently dropped.

### Decision 3: Materialize to files for `ansible-runner`
`ansible-runner` runs a playbook **file** from `project_dir` and authenticates with key **files**. So per run we:
- Write `playbook.content` to a uniquely-named `.yml` inside the project dir (or a per-run `private_data_dir`).
- Write each distinct credential's `private_key` to a `0600` temp key file.
- Build the inventory JSON (`{"all": {"hosts": {name: HostVars}}}`) with `ansible_host`, `ansible_user`, `ansible_ssh_private_key_file`, and `ansible_port` (from `portSSH`) per host, reusing the existing `HostVars`/`Inventory` types.
- Clean up the materialized playbook + key files in a `finally` after the run completes (keys are secrets).

### Decision 4: Stream over SSE, consistent with `/ping`
Reuse `AnsibleRunner.stream()` and the SSE helpers from `ping.py` (extract the shared `_sse`/`_event_payload` helpers so both routes share them). The endpoint returns `StreamingResponse(media_type="text/event-stream")`, emitting one event per Ansible event and a final `done` event with `status`/`rc`/`ok`, plus an `error` event on failure. The declared synchronous `RunResponse` model is dropped in favor of the stream.

### Decision 5: Auth
`POST /api/v0/run` depends on `CurrentUser` (validates the session cookie). The same incoming `Cookie` header is forwarded to the backend `run.resolve` RPC call so the protected procedure accepts it.

## Risks / Trade-offs

- **Private keys written to disk** → write under a restricted dir with `0600`, and always delete in a `finally`; never log key contents.
- **Private keys traverse an internal HTTP hop** → call is authenticated (forwarded session cookie) and both services are internal; revisit if the resolver is ever exposed publicly.
- **Playbook content is arbitrary YAML executed on the runner host** → out of scope to sandbox here; same trust model as the existing `ping` playbook. Note for a future hardening change.
- **Selection references missing/credential-less devices** → resolver returns a structured error; `/run` surfaces it as an SSE `error` event with a clear message instead of starting a partial run.
- **`credentials` RPC `get/update` currently type `id` as `z.number()` while the column is uuid** → the resolver must join on `credential_id` directly (not via that procedure), sidestepping the mismatch; flagged but not fixed here.

## Open Questions

- Should a run with *some* unreachable/credential-less hosts proceed for the valid hosts, or fail the whole request? (Current design: fail fast on credential-less devices.)
- Where should materialized playbook/key files live — a dedicated per-run `private_data_dir` vs the shared project dir? (Leaning per-run temp dir for isolation and easy cleanup.)
