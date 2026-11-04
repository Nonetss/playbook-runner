## 1. Database (schema edit by the agent, migration by the user)

- [x] 1.1 **USER, the agent stops here and asks:** confirm the schema edit in 1.2 when starting to apply this change, as `AGENTS.md` requires an explicit request. Verified when the user confirms
- [x] 1.2 Add nullable `vaultPassword: text("vault_password")` to `packages/db/src/schema/playbook-repositories.ts` and `vaultPassword: null` to `repositoryRow` in `packages/db/testing/rows.ts`; verify `bun run check-types` shows only the type errors the next groups resolve
- [x] 1.3 **USER, the agent stops here and asks:** generate and apply the migration. The agent never runs `db:generate`, `db:push` or `db:migrate`, and never touches `packages/db/src/migrations/`. Unit tests need no database, so groups 2 to 5 can proceed meanwhile; group 7 cannot. Verified when the user confirms it is applied

## 2. Repository API

- [x] 2.1 Add the `vaultPassword` schema to `repositories/input.ts` (non-empty, bounded length, no leading or trailing whitespace, nullish on `update`); verify with `call(procedure, …)` tests that empty and space-padded values fail with `BAD_REQUEST`
- [x] 2.2 Add `hasVaultPassword` to `repositories/output.ts` and one mapper used by every handler returning a row and by `sync.ts`; verify in `tests/v1/repositories/handler.test.ts` and `sync.test.ts` that outputs carry the boolean and never the column
- [x] 2.3 Encrypt with `encryptSecret` in `create` and `update`; verify with `stepArgs(call, "values")` and `stepArgs(call, "set")` that a string is stored as `v1:…`, null clears it, and an omitted password leaves no key in `.set()`

## 3. Runner

- [x] 3.1 Add `optional string vault_password` to `GitSource` in `proto/run.proto` with the next free field number, and to `GitPlaybookSource` and `playbook_from_proto` in `models.py`; verify `bun run generate-grpc` and `bun run check-types`
- [x] 3.2 Write `run_dir/vault-password` (`0600`) and set `ANSIBLE_VAULT_PASSWORD_FILE` in `_materialize_git`; verify in `tests/test_materialize.py` the mode, that it is not executable, that it is absent without a password, and that `cleanup` removes it
- [x] 3.3 Prove the mechanism end to end with a `pytest` that runs a real `ansible-playbook` with a local connection, no network, a `!vault` variable and an encrypted `vars_files` entry through the materialized environment, including the wrong-password failure. If the variable does not work through `ansible-runner`, update `design.md` and tell the user before continuing
- [x] 3.4 Mask the password through `masked_values`/`redact` in `_run_bundle` with or without secret variables; verify with a test that output containing it is masked and that a run with Infisical variables still masks those
- [x] 3.5 Refuse encrypted files in `retarget_playbook` with a dedicated error naming the file, reported by `_run_bundle` as `RunBundleResponse(error=…)`; verify in `tests/test_play_targets.py` an encrypted import raises, a plain playbook with `!vault` is still retargeted, and in a runner test that no Ansible process starts
- [x] 3.6 Verify in `tests/test_discover.py` that a fully encrypted `.yml` is not listed as a playbook, and that an encrypted `vars_files` entry or role `vars/main.yml` produces no variables and no failure; fix discovery only if a test fails
- [x] 3.7 Added during verification, which showed a load failure reached the user with no reason: end the stream with an `error` frame carrying Ansible's message when a run fails, Ansible displayed an error and no host reported a failure, leaving failed tasks ending in `done`; verify in `tests/test_vault.py` through `RunBundle` with a real Ansible
- [x] 3.8 Added during verification, which showed every interactive error frame reached the browser as a generic `INTERNAL_SERVER_ERROR`: map it in `interactive()` (`run/stream-handler.ts`) to `UNPROCESSABLE_CONTENT` keeping its message; verify in `stream-handler.test.ts` for each run kind

## 4. Backend run wiring

- [x] 4.1 Select the column in `resolveGitSource` and add `vault_password` through `decryptSecret`, leaving it undefined without one; verify in the `run/resolve` tests that it is decrypted, absent without a password, and absent for inline playbooks
- [x] 4.2 Verify with `stream-handler.test.ts` and `jobs/executor.test.ts` that the Git source reaches `grpc.serverStream` with the password, and that sync and listing requests never carry it, without changing either handler

## 5. Frontend

- [x] 5.1 Add the password field to `repository-form-modal.tsx` (`type="password"`, `autoComplete="new-password"`, keep hint, remove action when `hasVaultPassword`), sending undefined, null or the value; verify `bun run check-types` and manually in group 7
- [x] 5.2 Add the copy to `locales/es/playbooks.json` and `locales/en/playbooks.json`, stating that the password is never shown again and that tasks need `no_log`; verify both files have the same keys

## 6. Documentation

- [x] 6.1 Load `colofon-documentation` and read `docs/AGENTS.md`, then update `docs/catalog/reglas/vault-no.yaml` (keeping its id, which the contract forbids renaming, and changing its content to what now holds: needs the repository's password, not on inline playbooks, encrypted playbooks refused, no masking), `docs/docs/ejecucion/variables.mdx`, `index.mdx`, `materializacion.mdx`, `docs/docs/guias/crear-playbook.mdx` and `docs/skills/write-playbook/SKILL.md`; verify with `colofon-check`
- [x] 6.2 Add an Ansible Vault page to `apps/site/src/content/docs/en/` and `es/`, recommending Infisical for new secrets and explaining `no_log`; verify `bun run --filter site build`
- [x] 6.3 Add the Vault flow to the "Env & runtime gotchas" in `AGENTS.md`; verify it names the column, the `GitSource` field and the encrypted playbook refusal

## 7. Final verification

- [x] 7.1 Run `bunx biome ci .`, `bun run check-types` and `bun run test`; verify all pass, reporting any failure as it is
- [x] 7.2 After 1.3, in the running app: register a repository with a `!vault` playbook and its password, run it interactively and as a job, confirm `hasVaultPassword` in `/rpc` without the value, then replace and remove the password and confirm the run fails with the decryption error
