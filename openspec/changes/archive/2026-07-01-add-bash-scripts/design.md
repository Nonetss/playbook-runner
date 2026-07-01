## Context

The stack already has every ingredient this feature needs, in three proven shapes:

- **Playbooks** are a CRUD resource: `playbooks` table (`id, name, description, content, timestamps`), `playbooksRouter`/`playbooksHandler`, and a `components/features/playbooks/*` frontend (cards, list, form page). This is the exact shape a "Scripts" store should mirror.
- **Host resolution** is centralized: `runHandler.resolveHosts(inventory)` expands groups → devices, joins credentials, guards credential-less devices, and dedupes. `resolveRun(playbookId, inventory)` = "load playbook + resolveHosts". Both feed the SSE run flow.
- **Ad-hoc execution** already exists: `POST /api/v0/command` resolves hosts, calls `materialize_hosts()` (writes per-host `0600` keys + inventory, no playbook), and runs `ansible_runner` in ad-hoc mode (`host_pattern` + `module` + `module_args`) via `AnsibleRunnerConfig`, streaming SSE. `useRunCommand` drives it from the browser.

Running a stored bash script is "command execution, but the module is `script` and its argument is a materialized file path." The `script` module transfers the local script to each remote host, executes it, and cleans it up — no need for the script to pre-exist on the target. So this change is mostly **assembly of existing parts** plus a new CRUD resource.

## Goals / Non-Goals

**Goals:**
- A standalone Scripts section mirroring Playbooks (list/create/edit/delete + navbar entry).
- A run page mirroring the playbook/command run flow (inventory picker + live SSE console), with `become` and `forks`.
- Execute via the Ansible `script` module (transfer + run + remote cleanup).
- Reuse `resolveHosts`, `materialize_*`, the ad-hoc runner, and the SSE contract unchanged.

**Non-Goals:**
- Passing arguments/parameters to scripts (v1 runs the script as-is; a later change can add an args field).
- Scheduling scripts via the jobs system (jobs are playbook-based today; out of scope here).
- Persisting script run history (parity with the ephemeral playbook/command runs).
- A shared `<RunConsole>` extraction — still deferred (tracked from the command change); this feature copies the console helpers like the command page did.

## Decisions

### Decision 1: `scripts` table mirrors `playbooks`
New Drizzle table `scripts` with `id, name, description, content, createdAt, updatedAt` — a byte-for-byte analog of `playbooks`. Export from `schema/index.ts`; generate one migration with `db:generate`.
- *Rationale:* identical lifecycle to playbooks; no reason to invent a different shape.
- *Alternative rejected:* reusing the `playbooks` table with a `type` discriminator — muddies playbook semantics (YAML vs shell), breaks the clean "run playbook" contract, and complicates the existing UI.

### Decision 2: Backend — `scriptsRouter` CRUD + `run.resolveScript`
Add `scriptsHandler` + `scriptsRouter` copied from the playbook equivalents (same procedures/inputs). For execution, add `runHandler.resolveScript(scriptId, inventory)` returning `{ script: { name, content }, hosts }`, implemented as "load script + `resolveHosts(inventory)`" — the direct analog of `resolveRun`. Expose it as oRPC `run.resolveScript`, mapping the same typed errors as `resolve`.
- *Rationale:* one source of truth for host resolution; `resolveScript` and `resolveRun` stay structurally identical and easy to reason about.

### Decision 3: Ansible service — `POST /api/v0/script`, `script` module
New route `script.py` mirrors `command.py`: read cookie → `resolve_script` (new backend-client call returning script + hosts) → materialize keys **and** the script file → run `ansible_runner` with `module="script"`, `module_args=<materialized script path>`, `host_pattern="all"`, `become` via `extravars` → stream SSE. Factor the script-file materialization next to `materialize_hosts` (e.g. `materialize_hosts` + a small `write_script_file(run_dir, content)` returning the path); reuse `cleanup()` which already `rmtree`s the run dir (so the script file is removed too).
- *Rationale:* the `script` module is the idiomatic "run a local script on remote hosts"; it handles transfer + execution + remote cleanup, supports `become`, and needs no remote pre-provisioning. The SSE/event shape is unchanged, so the frontend console is reused verbatim.
- *Alternative rejected:* inlining the script content through the `shell` module (heredoc). Fragile for large scripts, shell-quoting hazards, and loses the clean file-transfer semantics.

### Decision 4: Frontend — `scripts` feature mirrors `playbooks`, with a `useRunScript` hook
New `components/features/scripts/*`: `scripts-page`, `script-list`, `script-card`, `script-form-page` (name + description + monospace content editor), plus a `run-script-page` cloned from `run-playbook-page` (inventory picker + console) and a `useRunScript` hook cloned from `useRunCommand` but posting `{ scriptId, inventory, become, forks }` to `/ansible/api/v0/script`. New Astro pages under `pages/scripts/*` and a `{ href: "/scripts", label: "Scripts" }` navbar link + prefetch entry.
- *Rationale:* structural parity with playbooks keeps the code predictable; the run page reuses the shared `RunEvent`/`RunResult` types and event-describing helpers.

## Risks / Trade-offs

- **Arbitrary remote script execution** → Mitigation: identical trust boundary to playbook and command execution (already permitted for authenticated users); no new privilege surface. A future RBAC/audit change can gate all three uniformly.
- **`script` module requires the script to be executable/interpretable on the target** → Mitigation: rely on the shebang (`#!/bin/bash`); the module sets execute bits on transfer. Document that scripts should start with a shebang; a bad interpreter surfaces as a normal per-host failure on the stream.
- **Large scripts / verbose output flooding SSE** → Mitigation: reuse the existing `stream_runner_events` backpressure path and low default `forks`, same as the command page.
- **Code duplication (console helpers, SSE hook, run page)** → Mitigation: intentional and consistent with the command change; leave the existing TODO to extract a shared `<RunConsole>` + SSE helper across playbook/command/script in a follow-up refactor.
- **Migration must be applied before the service resolves scripts** → Mitigation: purely additive table; deploy DB migration + backend + ansible together (see Migration Plan).

## Migration Plan

Additive across the board: new `scripts` table (one generated Drizzle migration), new oRPC procedures, new Ansible endpoint, new frontend routes. Order: apply DB migration → deploy backend (exposes `scripts.*` + `run.resolveScript`) → deploy ansible service (depends on `run.resolveScript`) → frontend. Rollback = revert deploys; the `scripts` table can be dropped safely since nothing else references it.

## Open Questions

- Should scripts accept runtime arguments (a params field appended to `module_args`)? (Proposed: no for v1, add later.)
- Should stored scripts be runnable as scheduled jobs like playbooks? (Proposed: out of scope; revisit if requested.)
- Extract the shared `<RunConsole>` + SSE helper now that a third consumer exists? (Proposed: defer to a dedicated refactor change, but this feature is the tipping point.)
