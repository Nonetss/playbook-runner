## 1. Option parsing

- [x] 1.1 Make `_nearest_config` in `apps/ansible/app/services/ansible/inventory_vars.py` public (`nearest_config`) and update its callers; verify `uv run pytest tests/test_inventory_vars.py` still passes
- [x] 1.2 Create `apps/ansible/app/services/ansible/config_options.py` with the allowlist table (`(section, key)` → validator) for `timeout`, `task_timeout`, `gather_timeout`, `gathering`, `retries`, `pipelining`, `connect_timeout`, `command_timeout`, `connect_retry_timeout`; verify with unit tests that each key accepts a valid value and rejects `soon`, a negative number and an empty value
- [x] 1.3 Implement `load_config_options(playbook_path, project_dir)` returning applied options and discards (`not_allowed`, `runner_controlled` for `forks`/`host_key_checking`/`ssh_args`, `invalid`), reading with the same `configparser` settings as `inventory_vars` and treating an unparsable file or a symlink as absent; verify with tests for: nearest file wins and files are not merged, no file, invalid INI, symlinked file, unknown section and key, and that discarded out-of-list values never appear in the result

## 2. Wire it into the Git run

- [x] 2.1 Add a function that serializes the applied options to INI text and have `_materialize_git` (`materialize.py`) write it to `runner-ansible.cfg` instead of an empty file, keeping `ANSIBLE_CONFIG` pointed at it; verify with a test over a real exported tree that the written file contains only allowlisted keys and that `callback_plugins`, `library`, `roles_path` and `forks` from the repository are absent
- [x] 2.2 Log applied and discarded options once per Git run from `_materialize_git`, naming key and reason for discards and never the value of an out-of-list key; verify with a test that captures the log for a mixed `ansible.cfg` (`timeout = 60`, `roles_path = ./x`, `retries = many`)
- [x] 2.3 Verify precedence with a test that sets `ANSIBLE_TIMEOUT` in the run's `envvars` while the repository declares another `timeout`, asserting the generated `runner-ansible.cfg` is still produced and the environment variable is untouched; run `ansible-config dump --only-changed` with `ANSIBLE_CONFIG` pointing at the generated file to confirm the value Ansible reports for a repository-only option and for the overridden one
- [x] 2.4 Confirm that playbooks written in the app, commands, scripts and pings still run without any repository option, by checking their paths do not call the new code (existing tests in `apps/ansible/tests` keep passing)

## 3. Documentation and project rules

- [x] 3.1 Update `docs/docs/ejecucion/` and the relevant recipe in `docs/docs/guias/` with the allowlist, the precedence and the log line; read `docs/AGENTS.md` and load the `colofon-documentation` skill first, and verify the site validates with the platform's reader (`colofon-check`)
- [x] 3.2 Update the `reglas` catalog type and the served skills in `docs/skills/` (`write-playbook`, `write-role`) where they say the repository's `ansible.cfg` is ignored; verify with a search that no page still states it without the allowlist
- [x] 3.3 Update the `AGENTS.md` sentences that say the repository's `ansible.cfg` stays ignored (the materialization paragraph on Git repositories), and verify with a search for `ansible.cfg` in `AGENTS.md` and `openspec/specs`

## 4. Final checks

- [x] 4.1 Run `bun run check-types`, `bun run format`/`bunx biome ci .` and `bunx turbo run test --filter=ansible`; verify all pass
- [x] 4.2 Run `openspec validate apply-repository-ansible-cfg-options` and verify it reports no errors
