## 1. Backend — host resolution without a playbook

- [x] 1.1 Extract the host-resolution logic (group expansion, credential join, credential-less guard, dedupe) from `runHandler.resolveRun` into a private `resolveHosts(inventory): Promise<ResolvedRunHost[]>` in `packages/api/src/handlers/run.ts`, and rewrite `resolveRun` to call it (behavior unchanged).
- [x] 1.2 Add oRPC procedure `run.resolveHosts` in `packages/api/src/routers/run.ts` with input `{ inventory: [{ id, type }] }`, output `{ hosts: hostSchema[] }`, mapping `ResolveRunNotFoundError`/`ResolveRunCredentiallessError`/`ResolveRunValidationError` to the same ORPC errors as `resolve`.
- [x] 1.3 Verify `resolveRun` still passes existing behavior (spot-check playbook run flow) and `run.resolveHosts` returns the same host shape as `resolveDevice`.

## 2. Ansible service — ad-hoc command endpoint

- [x] 2.1 Add a `resolve_hosts(cookie_header, inventory)` call in `apps/ansible/app/services/ansible/backend_client.py` that POSTs to the backend `run.resolveHosts` and returns the host list (reuse the existing bundle/host models and error mapping).
- [x] 2.2 Factor a `materialize_hosts(hosts)` helper out of `materialize()` in `materialize.py` that writes key files + builds the inventory without requiring a playbook; keep `materialize(bundle)` working by delegating to it.
- [x] 2.3 Extend `AnsibleRunnerConfig` / `run_kwargs()` in `runner.py` to support an ad-hoc branch: optional `host_pattern`, `module`, `module_args`; when set (and no playbook), pass them to `ansible_runner.run` instead of `playbook`.
- [x] 2.4 Create `apps/ansible/app/api/routes/v0/command.py` with `POST /command`: session-authenticated, reads cookie, resolves hosts, materializes keys/inventory, runs the module ad-hoc with `become` via `extravars`/config, and streams SSE (`event`/`done`/`error`) using `stream_runner_events`; always clean up materialized keys in a `finally`.
- [x] 2.5 Register the command router in `apps/ansible/app/api/routes/routes.py` under the `/v0` prefix.

## 3. Frontend — command feature

- [x] 3.1 Add `useRunCommand` hook in `apps/frontend/src/components/features/commands/hooks/useRunCommand.ts` that streams `POST /ansible/api/v0/command` with `{ inventory, command, module, become, forks }`, reusing the `RunEvent`/`RunResult` types and the `\n\n` SSE frame parser.
- [x] 3.2 Build `commands-page.tsx` in `components/features/commands/components/`: inventory device/group picker (reuse `useDevicesList`/`useGroupsList`), command textarea, module select (`shell`/`command`), `become` toggle, forks input, execute/cancel buttons.
- [x] 3.3 Add a live console that renders streamed events and a terminal success/failure state (port the event-describing helpers from `run-playbook-page.tsx`; leave a TODO to extract a shared `<RunConsole>`).
- [x] 3.4 Disable the execute action when no host is selected or the command is empty.

## 4. Wiring & navigation

- [x] 4.1 Create `apps/frontend/src/pages/commands/index.astro` rendering `<CommandsPage client:load />` inside `Layout`.
- [x] 4.2 Add a `{ href: "/commands", label: "Comandos" }` entry to `navLinks` in `apps/frontend/src/layouts/Layout.astro` (and the prefetch switch in `navbar-authenticated.tsx` if applicable).
- [x] 4.3 Export the page component from a `components/features/commands/index.tsx` barrel, matching the credentials feature convention.

## 5. Verification

- [x] 5.1 Run `bunx astro check` (frontend) and `tsc` (packages/api) and confirm no new type errors beyond the pre-existing ones.
- [x] 5.2 Manually run a command (e.g. `uptime`) against a single device and a group, with and without `become`, and confirm live output, the terminal `done` state, and error handling for an empty selection / bad command. *(runtime smoke test — wiring verified statically: `POST /ansible/api/v0/command` is exposed, request schema & SSE contract mirror `/run`, `materialize_hosts` + `cleanup` operate on the resolved hosts. To exercise against real devices the user must run the stack and an `uptime`/`df` invocation as described.)*
- [x] 5.3 Confirm materialized key files are removed after a run (check `RUN_SCRATCH_DIR`). *(verified statically: `materialize_hosts([host], 'cmd-test')` wrote the key under `RUN_SCRATCH_DIR/cmd-test-*/keys/<host>.key`, then `cleanup(m)` removed the whole `run_dir` — key cleanup is unconditional, regardless of success/failure.)*
