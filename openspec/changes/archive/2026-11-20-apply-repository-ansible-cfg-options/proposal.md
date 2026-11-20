## Why

A Git playbook runs with an empty, runner-controlled `ANSIBLE_CONFIG`, so the
repository's `ansible.cfg` is ignored. A repository that tunes `timeout`,
`task_timeout` or SSH `retries` for its slow hosts behaves differently in the
runner than in a local run, and the only workaround is to repeat each value as
an extra variable on every run. The runner already parses that file to find the
inventory, so reading a few more keys is cheap; what needs care is not letting
a commit that nobody reviewed (repositories sync hourly) change what the runner
loads or executes.

## What Changes

- The runner reads the nearest `ansible.cfg` (the one already located for
  inventory variables) and applies an allowlist of behaviour keys, translated
  to the `ANSIBLE_*` environment variables Ansible documents for them.
- The allowlist covers timeouts, retries and fact gathering only:
  `[defaults]` `timeout`, `task_timeout`, `gather_timeout`, `gathering`;
  `[ssh_connection]` `retries`, `pipelining`; `[persistent_connection]`
  `connect_timeout`, `command_timeout`, `connect_retry_timeout`.
- Every other key stays ignored, notably anything that loads code or paths
  (`library`, `*_plugins`, `roles_path`, `collections_path`, `remote_tmp`,
  `vault_password_file`, `private_key_file`, `ssh_args`, `inventory`). Keys the
  runner already controls (`forks`, `host_key_checking`, `ssh_args`) are not
  honoured either.
- A value that is not valid for its type (for example `timeout = soon`) is
  dropped and does not stop the run.
- Precedence: what the runner sets itself, then the repository's values, then
  Ansible's defaults. The repository file never overrides the runner.
- The runner logs which keys it applied and which it discarded for each run.
  No new API, database column or UI; showing it in the interface is left for a
  later change.
- Only Git playbooks are affected: playbooks written in the app have no
  `ansible.cfg`, and ad-hoc commands, scripts and pings are unchanged.

## Capabilities

### New Capabilities
- `repository-ansible-config`: which `ansible.cfg` options of a Git repository
  the runner honours, how they are validated and how they rank against the
  runner's own settings.

### Modified Capabilities
- `playbook-execution`: "Materialize playbook and credentials for execution"
  currently says the repository's `ansible.cfg` is ignored; it now ignores it
  except for the allowlisted options.
- `playbook-repository-roles`: the sentence "The repository's own `ansible.cfg`
  SHALL remain ignored" is narrowed to the keys outside the allowlist; role
  paths stay ignored.

## Impact

- `apps/ansible`: new module `app/services/ansible/config_options.py`, a change
  in `_materialize_git` (`app/services/ansible/materialize.py`) and pytest
  tests. `_nearest_config` in `inventory_vars.py` is reused (moved or exported).
- No change to `proto/`, `packages/api`, `packages/db` or the frontend, so no
  migration and no gateway route.
- Docs, in the same change as AGENTS.md requires: `docs/docs/ejecucion/`,
  `docs/docs/guias/`, the `reglas` catalog type and the served skills in
  `docs/skills/`; and the `AGENTS.md` line about the ignored `ansible.cfg`.
- Behaviour: a repository whose `ansible.cfg` sets one of these keys will start
  running with it. A very large `timeout` or `task_timeout` can make a run last
  longer; `MAX_CONCURRENT_RUNS` still bounds concurrency.
