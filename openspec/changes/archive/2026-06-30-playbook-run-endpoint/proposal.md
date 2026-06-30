## Why

The Ansible microservice already proves it can execute and stream a hardcoded playbook (`/api/v0/ping`), but there is no way to run a *real* playbook from the catalog against the inventory the user manages in the app. The `/api/v0/run` endpoint exists only as a stub. We need to turn a user's selection (a playbook + some devices/groups) into an actual execution, pulling the playbook body, the target hosts, and their SSH credentials from the system of record.

## What Changes

- Implement the `POST /api/v0/run` endpoint in the Ansible service so it accepts `{ playbookId, inventoryIds: [{ id, type: group|device }] }`, resolves it into a runnable bundle, executes it with `ansible-runner`, and streams events back over SSE (consistent with `/api/v0/ping`).
- Add a single backend RPC procedure that **resolves a run request server-side**: given a playbook id and an inventory selection, it expands groups to devices, de-duplicates hosts, joins each device to its credential, and returns the playbook `content` plus the fully-resolved host list (address, username, private key). The Ansible service consumes this instead of talking to the database directly — keeping Drizzle as the single source of truth and avoiding N+1 HTTP calls.
- Materialize the resolved bundle for `ansible-runner`: write the playbook `content` to a project file and each credential's private key to a per-run key file, then build the inventory JSON with per-host connection vars.
- Authenticate the run the same way `ping`/`me` already do: forward the caller's session cookie and validate it via the existing `get_current_user` dependency / backend session.

## Capabilities

### New Capabilities
- `playbook-execution`: The Ansible service capability that turns a playbook + inventory selection into a streamed `ansible-runner` execution, including resolving the run via the backend, materializing playbook/key files, and emitting SSE events.

### Modified Capabilities
- `rpc-api`: Add an authenticated "resolve run" procedure that returns a playbook's content together with its selection's de-duplicated hosts and their credentials, for consumption by the Ansible service.

## Impact

- **Ansible service**: `apps/ansible/app/api/routes/v0/run.py` (implemented), `routes.py` (mount `run` router under `/v0`), reuse of `services/ansible/runner.py` + `events.py`, new helper(s) to call the backend and materialize files, possibly new `config.py` settings (run/key scratch dir).
- **Backend / API package**: new procedure + handler in `packages/api/src/routers` and `packages/api/src/handlers` that performs the group→device→credential join.
- **Security**: private keys leave the DB and are written to disk transiently in the Ansible service; requires session auth and per-run cleanup of materialized key files.
- **No schema/migration changes**: reads existing `playbooks`, `inventory_*`, and `credentials` tables.
