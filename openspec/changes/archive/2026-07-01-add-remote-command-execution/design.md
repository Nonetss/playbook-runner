## Context

The app runs Ansible **playbooks** against inventory via three layers:

1. **Frontend** (`apps/frontend`, Astro + React): a page collects a playbook + inventory selection and opens an SSE stream to the Ansible service (`useRunPlaybook` → `POST /ansible/api/v0/run`).
2. **Ansible service** (`apps/ansible`, FastAPI): validates the session, calls the backend to resolve the selection into a bundle (playbook content + hosts + credentials), materializes files, and runs `ansible_runner.run(playbook=...)`, streaming events over SSE (`run.py`, `materialize.py`, `runner.py`, `sse.py`).
3. **Backend** (`packages/api`, oRPC): `run.resolveRun(playbookId, inventory)` expands groups → devices, joins credentials, and returns the bundle. `run.resolveDevice(deviceId)` already resolves a **single** host with no playbook (used by the ping feature).

Ad-hoc command execution needs the exact same connection/streaming machinery minus the playbook. `ansible_runner.run()` natively supports ad-hoc mode via `host_pattern` + `module` + `module_args` (no playbook file). The two missing pieces are: a backend resolve that returns hosts for a **multi-device/group** selection without a playbook, and a service endpoint that calls `ansible_runner` in ad-hoc mode.

## Goals / Non-Goals

**Goals:**

- A standalone "Comandos" page with its own route and navbar link, independent from the playbook run UI.
- Run an ad-hoc `shell`/`command` module against one or more devices/groups with live SSE output.
- Reuse existing credential resolution, key materialization, SSE plumbing, and the frontend console rendering.
- Optional `become` (sudo) toggle, aligned with the passwordless-sudo `ansible` user the provisioning script sets up.

**Non-Goals:**

- Persisting command history to the database (the interactive playbook run is likewise ephemeral). A future change can add a `command_runs` table.
- Scheduling/cron for commands (that is the jobs system).
- A new authorization model or per-command RBAC (see Risks).
- Multi-command scripts or file transfer.

## Decisions

### Decision 1: New page + feature folder, zero reuse of the playbook run UI

Per the explicit request, the command page is a separate route `pages/commands/index.astro` rendering a new `components/features/commands/*` feature, with its own navbar entry in `layouts/Layout.astro`. It does **not** touch `run-playbook-page.tsx`.

- *Rationale:* keeps the two flows decoupled; the command form (command text, module, become) differs enough from playbook selection that sharing would add conditionals.
- *Reuse anyway:* the inventory device/group picker and the terminal/console event renderer are good candidates to extract into shared components, but to avoid destabilizing the playbook page we **copy the console-rendering helpers** into the commands feature in this change and leave a follow-up note to extract a shared `<RunConsole>`.

### Decision 2: Backend — extract `resolveHosts(inventory)` and expose `run.resolveHosts`

Refactor the host-resolution half of `runHandler.resolveRun` into a private `resolveHosts(inventory)` returning `ResolvedRunHost[]` (group expansion, credential join, credential-less guard, dedupe). `resolveRun` then becomes "load playbook + `resolveHosts`". Add oRPC `run.resolveHosts` (input `{ inventory }`, output `{ hosts }`) mapping the same typed errors.

- *Rationale:* no behavior change to `resolveRun`; single source of truth for host resolution; `resolveDevice` stays for the single-device ping case.
- *Alternative rejected:* making `playbookId` optional on `resolveRun` — muddies its output contract (`playbook` would be nullable) and complicates callers.

### Decision 3: Ansible service — new `POST /api/v0/command`, ad-hoc runner mode

New route `command.py` mirrors `run.py`: read cookie → `resolve_hosts` (new backend-client call) → materialize keys + build inventory → run → stream SSE. Extend `AnsibleRunnerConfig`/`run_kwargs()` to support an ad-hoc branch: when `module`/`host_pattern` are set (and no `playbook`), pass `host_pattern`, `module`, `module_args`, and `extravars["ansible_become"]` instead of `playbook`. Materialization is reused but split so a playbook is optional (build inventory + keys without writing a playbook file) — factor a `materialize_hosts(hosts)` helper out of `materialize(bundle)`.

- *Rationale:* `ansible_runner.run` accepts these kwargs directly; the event/SSE shape is identical, so the frontend console and event schema are unchanged.
- *Alternative rejected:* generating a throwaway one-task playbook wrapping the command (like the ping feature does). Works, but ad-hoc mode is cleaner, avoids YAML-escaping the command, and is the idiomatic path.

### Decision 4: Frontend — dedicated SSE hook `useRunCommand`

Clone the proven `useRunPlaybook` streaming logic (fetch → `ReadableStream` → `\n\n` frame parser → `event`/`done`/`error`) into `useRunCommand`, posting to `/ansible/api/v0/command` with `{ inventory, command, module, become, forks }`. Event/result types are identical to `RunEvent`/`RunResult`.

- *Rationale:* the SSE contract is shared; copying the ~40 lines keeps the command feature self-contained per Decision 1.

### Decision 5: Module + become defaults

Default `module: "shell"` (supports pipes/redirection), offer `command` as the safer no-shell option; `become` defaults **off**.

- *Rationale:* `shell` matches user expectation for quick commands; explicit `become` opt-in avoids surprise privilege escalation.

## Risks / Trade-offs

- **Arbitrary remote command execution is a powerful surface** → Mitigation: it is the *same* trust boundary already granted by playbook execution (any authenticated user can run a `shell` task today), so this opens no new privilege. Documented explicitly; a future RBAC/audit change can gate it if needed.
- **No audit trail (ephemeral runs)** → Mitigation: accepted for this change; noted as the first candidate for a follow-up `command_runs` persistence change so security-sensitive actions can be reviewed later.
- **Long-running or highly verbose commands can flood the SSE stream / buffer** → Mitigation: reuse the existing `stream_runner_events` backpressure path unchanged; keep `forks` bounded and default low; advise users these are meant for short operational commands.
- **`shell` module quoting/escaping surprises** → Mitigation: pass the raw command as `module_args` (ansible-runner handles quoting); expose the `command` module for users who want no shell interpretation.
- **Code duplication (console renderer, SSE hook, materialize)** → Mitigation: intentional per Decision 1/3; leave TODO markers and an Open Question to extract shared modules in a follow-up.

## Migration Plan

Purely additive: new route, new oRPC procedure (plus internal refactor of `resolveRun` that preserves behavior), new Ansible endpoint. No DB migration, no config changes. Deploy backend + ansible service together (the service depends on `run.resolveHosts`). Rollback = revert; nothing persisted, no schema to unwind.

## Open Questions

- Should command runs be restricted to admins, or is parity with playbook execution acceptable for v1? (Proposed: parity for v1.)
- Extract shared `<RunConsole>` and a single SSE helper across playbook + command features now, or defer? (Proposed: defer to a follow-up refactor change.)
- Do we want a persisted history (`command_runs`) in this change or a later one? (Proposed: later.)
