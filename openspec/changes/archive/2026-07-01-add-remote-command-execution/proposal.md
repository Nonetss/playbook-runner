## Why

Today the only way to run something on a managed device is to author a full playbook and execute it. For quick operational checks (`uptime`, `df -h`, restart a service) that ceremony is too heavy. We already have all the connection plumbing — stored credentials, inventory resolution, an Ansible microservice with SSE streaming — so exposing ad-hoc command execution is a small, high-value addition.

## What Changes

- Add a new, self-contained **"Comandos"** page (its own route + navbar entry) — deliberately **not** merged into the existing playbook run flow.
- The page lets a user pick one or more inventory devices/groups, type a shell command, choose the module (`shell` / `command`) and optionally run with `become` (sudo), then execute it live.
- Add an Ansible service endpoint `POST /api/v0/command` that runs an ad-hoc Ansible module (no playbook file) against the resolved hosts and streams events over SSE — mirroring the existing interactive `/run` endpoint.
- Add a backend resolve procedure that turns an inventory selection into a host bundle **without** requiring a `playbookId` (extracted from the existing `resolveRun` logic).
- Execution is **ephemeral/live-only** (like the interactive playbook run); no new DB persistence in this change.

## Capabilities

### New Capabilities

- `remote-command-execution`: Resolve an inventory selection into hosts and execute an ad-hoc Ansible command module against them, streaming events over SSE to a dedicated page.

### Modified Capabilities
<!-- None: the existing playbook-execution capability is untouched; host resolution is extended additively, not changed in behavior. -->

## Impact

- **Ansible service** (`apps/ansible`): new route `app/api/routes/v0/command.py`; reuses `materialize`/`runner`/`sse`/`events` and the `resolve_run`-style backend client.
- **Backend / oRPC** (`packages/api`): new `run.resolveHosts` procedure + `runHandler.resolveHosts` (refactored out of `resolveRun`); no schema changes.
- **Frontend** (`apps/frontend`): new page `pages/commands/index.astro`, feature folder `components/features/commands/*`, a new SSE hook, and a new navbar link in `layouts/Layout.astro`.
- **Security**: same trust boundary as running playbooks (both already permit arbitrary remote execution for any authenticated user); documented, not newly opened.
