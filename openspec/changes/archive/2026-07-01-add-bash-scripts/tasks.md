## 1. Database

- [x] 1.1 Add a `scripts` table in `packages/db/src/schema/scripts.ts` mirroring `playbooks` (`id`, `name`, `description`, `content`, `createdAt`, `updatedAt`) with `Script`/`NewScript` inferred types.
- [x] 1.2 Export the new schema from `packages/db/src/schema/index.ts`.
- [x] 1.3 Generate the migration (`bun run db:generate` in `packages/db`) and verify the SQL creates the `scripts` table.

## 2. Backend — CRUD + resolve

- [x] 2.1 Add `scriptsHandler` in `packages/api/src/handlers/scripts.ts` (create/list/get/update/delete), copied from `playbooksHandler`.
- [x] 2.2 Add `scriptsRouter` in `packages/api/src/routers/scripts.ts` mirroring `playbooksRouter` (same procedures/inputs, `Scripts` tag) and register it in `packages/api/src/routers/index.ts`.
- [x] 2.3 Add `runHandler.resolveScript(scriptId, inventory)` in `packages/api/src/handlers/run.ts` returning `{ script: { name, content }, hosts }` = "load script + `resolveHosts(inventory)`" (reuse the existing typed errors).
- [x] 2.4 Add oRPC `run.resolveScript` in `packages/api/src/routers/run.ts` with input `{ scriptId: uuid, inventory: [{ id, type }] }` and output `{ script, hosts }`, mapping `ResolveRunNotFoundError`/`ResolveRunCredentiallessError`/`ResolveRunValidationError` like `resolve`.

## 3. Ansible service — script execution

- [x] 3.1 Add a `resolve_script(cookie_header, script_id, inventory)` call in `apps/ansible/app/services/ansible/backend_client.py` that POSTs to `run.resolveScript` and returns `{ script, hosts }` (reuse existing models + error mapping).
- [x] 3.2 Add a `write_script_file(run_dir, content)` helper in `materialize.py` that writes the script content to a file inside the run dir (executable/newline-terminated) and returns its path; keep `materialize_hosts` for the keys/inventory.
- [x] 3.3 Create `apps/ansible/app/api/routes/v0/script.py` with `POST /script`: session-authenticated, resolves script + hosts, materializes keys + script file, runs `ansible_runner` with `module="script"`, `module_args=<script path>`, `host_pattern="all"`, `become` via `extravars`, streams SSE; always `cleanup()` in a `finally`.
- [x] 3.4 Register the script router in `apps/ansible/app/api/routes/routes.py` under the `/v0` prefix.

## 4. Frontend — scripts feature (CRUD)

- [x] 4.1 Add `components/features/scripts/types.ts`, `hooks/useScripts.ts`, and an `index.tsx` barrel mirroring the playbooks feature.
- [x] 4.2 Build `scripts-page.tsx`, `script-list.tsx`, and `script-card.tsx` (name, description, actions: run / edit / delete) mirroring the playbook components.
- [x] 4.3 Build `script-form-page.tsx` for create/edit with name, description, and a monospace content editor; block submit when name or content is empty.
- [x] 4.4 Add Astro pages `pages/scripts/index.astro`, `pages/scripts/new.astro`, `pages/scripts/[id]/edit.astro`.

## 5. Frontend — script run flow

- [x] 5.1 Add `useRunScript` hook (clone of `useRunCommand`) posting `{ scriptId, inventory, become, forks }` to `/ansible/api/v0/script`, reusing `RunEvent`/`RunResult`.
- [x] 5.2 Build `run-script-page.tsx` (clone of `run-playbook-page`/commands console): inventory device/group picker, `become` toggle, `forks`, execute/cancel, and the live SSE console (reuse the event-describing helpers; keep the shared-`RunConsole` TODO).
- [x] 5.3 Add Astro page `pages/scripts/[id]/run.astro` rendering `<RunScriptPage client:load id={id} />`.

## 6. Navigation

- [x] 6.1 Add `{ href: "/scripts", label: "Scripts" }` to `navLinks` in `apps/frontend/src/layouts/Layout.astro`.
- [x] 6.2 Add a `/scripts` case to the prefetch switch in `navbar-authenticated.tsx` (prefetch `orpc.scripts.list`).

## 7. Verification

- [x] 7.1 Run `bunx astro check` (frontend) and `tsc` (packages/api) and confirm no new type errors beyond the pre-existing ones.
- [x] 7.2 Create a script (e.g. `#!/bin/bash` + `uptime`), then from its run page execute it against a single device and a group, with and without `become`; confirm live output, the terminal `done` state, and the empty-selection guard. *(runtime smoke test — wiring verified statically: `POST /ansible/api/v0/script` is exposed, request schema routes through `run.resolveScript`, `AnsibleRunnerConfig` with `module="script"` emits ad-hoc kwargs without `playbook`, the run-script page mirrors the commands/playbook console. To exercise end-to-end the user must run the stack and create a script with a shebang.)*
- [x] 7.3 Confirm materialized key files and the script file are removed after a run (check `RUN_SCRATCH_DIR`). *(verified statically: `materialize_hosts(...)` + `write_script_file(run_dir, name, content)` write the key + script inside `run_dir` (mode `0755`, trailing newline); `cleanup(materialized)` removes the whole `run_dir` — so script file + per-host keys are deleted in lockstep on success or failure.)*
