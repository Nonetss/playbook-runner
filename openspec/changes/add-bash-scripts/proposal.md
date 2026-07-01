## Why

Users can already store and run **playbooks**, and run **ad-hoc commands** from the Comandos page. But there is no home for reusable **bash scripts** — the many-line operational scripts (backups, health checks, provisioning tweaks) that are too big for a one-liner command yet aren't worth authoring as Ansible YAML. Storing them and running them ansible-style (against inventory, with live output) closes that gap and reuses machinery we already have.

## What Changes

- Add a new top-level **"Scripts"** section, mirroring the Playbooks section: list, create, edit, and delete stored bash scripts (name, description, `.sh` content editor). Own navbar entry and routes (`/scripts`, `/scripts/new`, `/scripts/[id]/edit`).
- Add a **run page** for a stored script (`/scripts/[id]/run`) that mirrors the playbook/command run flow: pick inventory devices/groups, optional `become` (sudo) and `forks`, execute, and watch a live SSE console.
- Execute scripts via the Ansible **`script` module**: the service materializes the stored script to a file and Ansible transfers + runs it on each remote host (with cleanup), reusing the ad-hoc runner and streaming plumbing.
- Add a `scripts` DB table (mirrors `playbooks`), a `scripts` oRPC CRUD router, a backend resolve that returns `{ script, hosts }`, and an Ansible `POST /api/v0/script` endpoint.

## Capabilities

### New Capabilities
- `bash-script-management`: Store bash scripts as first-class resources (CRUD) with name, description, and content.
- `bash-script-execution`: Resolve a stored script + inventory selection and execute it against the hosts via the Ansible `script` module, streaming events over SSE.

### Modified Capabilities
<!-- None. Playbook execution and remote-command-execution are untouched; host resolution (`run.resolveHosts`) is reused as-is. -->

## Impact

- **DB** (`packages/db`): new `scripts` table + schema export; one generated migration.
- **Backend / oRPC** (`packages/api`): new `scriptsRouter` (CRUD, mirrors `playbooksRouter`) + `scriptsHandler`; new `run.resolveScript(scriptId, inventory)` returning `{ script: { name, content }, hosts }` (reuses `resolveHosts`).
- **Ansible service** (`apps/ansible`): new route `app/api/routes/v0/script.py` running the `script` module; reuses `materialize`/`runner`/`sse`; a small helper to materialize the script file alongside host keys.
- **Frontend** (`apps/frontend`): new `components/features/scripts/*` feature (cards, list, form page, run page, hooks), new pages under `pages/scripts/*`, and a navbar link in `layouts/Layout.astro`.
- **Security**: same trust boundary as playbook and command execution (arbitrary remote execution for authenticated users); no new privilege surface.
