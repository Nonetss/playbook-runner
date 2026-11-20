## Context

See `proposal.md` for the motivation. Today `_materialize_git`
(`apps/ansible/app/services/ansible/materialize.py`) writes an empty
`runner-ansible.cfg` into the run directory and points `ANSIBLE_CONFIG` at it,
so nothing from the repository's `ansible.cfg` reaches Ansible. Separately,
`inventory_vars.py` already finds the nearest `ansible.cfg` (`_nearest_config`:
from the playbook's directory up to the repository root, regular files only, no
symlinks) and parses it with `configparser` to read `[defaults] inventory`.

Ansible's precedence is environment variables over the configuration file over
defaults, and the run's environment is the runner process environment plus the
`envvars` of `AnsibleRunnerConfig` (`ssh_envvars()` and the materialized ones).
The runner's settings must keep ranking above anything a repository declares.

## Goals / Non-Goals

**Goals:**
- Honour a small allowlist of behaviour options (timeouts, retries, gathering)
  from the repository's `ansible.cfg` for Git playbook runs.
- Keep the guarantee that a commit cannot make the runner load or execute
  repository code, change paths, or alter credentials and host key policy.
- Never fail a run because of the file; say what was applied or dropped.

**Non-Goals:**
- No interface, API, proto or database change. Showing the applied options in
  the UI is a later change.
- No merging of several `ansible.cfg` files and no support for `ANSIBLE_CONFIG`
  lookups outside the exported tree, home directory or `/etc/ansible`.
- No per-run override of these options in this change.
- No honouring of `forks`, `host_key_checking`, `ssh_args`, `inventory` or any
  option that selects code or paths.

## Decisions

**1. Write the validated options into `runner-ansible.cfg` instead of exporting
environment variables.**
`runner-ansible.cfg` stops being empty: it holds only the allowlisted options,
re-serialized by the runner from validated values. Ansible then applies its own
precedence, so the runner's `envvars` (and any `ANSIBLE_*` set by the operator on
the container) still outrank the repository without any merge code of ours, and
the repository file itself is never handed to Ansible.
Alternatives: translating to `ANSIBLE_*` environment variables needs a table
of variable names per option and would outrank an operator's own configuration
unless we also check `os.environ`; copying the repository's file and stripping
keys fails open when a key is forgotten or a new Ansible version adds one.

**2. One table drives validation and serialization.**
New module `app/services/ansible/config_options.py` with a mapping
`(section, key) → parser` where the parser returns the normalized string or
raises `ValueError`: non-negative integers for `timeout`, `task_timeout`,
`gather_timeout`, `retries`, `connect_timeout`, `command_timeout`,
`connect_retry_timeout`; a boolean for `pipelining`; one of `implicit`,
`explicit`, `smart` for `gathering`. The allowlist *is* the table, so adding a
key is one line plus its test, and anything absent is ignored by construction.
Integer upper bounds are not imposed: `MAX_CONCURRENT_RUNS` and the run's own
cancellation already bound the cost, and a documented limit would need a number
nobody has asked for.

**3. Reuse the existing lookup, do not widen it.**
`_nearest_config` becomes public (renamed `nearest_config`, same module or moved
to a small shared module) so the inventory and the options come from the same
file. A symlink is never read. A file that fails `configparser` (including
`UnicodeDecodeError`) counts as absent.

**4. `configparser` settings match `inventory_vars`.**
`interpolation=None`, `strict=False`, `;` inline comments, so `%` in a value does
not raise and a duplicated key keeps the last value like Ansible's own parser.
Section and key names are lowercased by `configparser`, as Ansible does for
keys. A key the table does not list is recorded as discarded, with its name but
not its value.

**5. Report through the run's logger.**
`load_config_options(playbook_path, project_dir)` returns
`(applied: dict[str, dict[str, str]], discarded: list[Discard])`; `_materialize_git`
logs both once per run (structured log with run id when available) and writes
`applied`. Discard reasons: `not_allowed`, `runner_controlled` (for `forks`,
`host_key_checking`, `ssh_args` so the log explains the common surprise) and
`invalid`.

**6. Only the Git path changes.**
Playbooks written in the app, ad-hoc commands, scripts and pings never call
`_materialize_git`, so they keep an Ansible with no repository options.

## Risks / Trade-offs

- [A repository sets a huge `timeout` or `task_timeout` and a run hangs
  longer] → `MAX_CONCURRENT_RUNS` still limits concurrency and a manual cancel
  works at any time; the log makes the cause visible. Accepted rather than
  capped, since a silent cap would reintroduce the "behaves differently than
  locally" problem.
- [The unreviewed hourly sync pulls a changed `ansible.cfg` into scheduled
  jobs] → the allowlist only contains options that change timing and retries,
  never code or paths; recorded in the docs.
- [`pipelining = True` changes how Ansible uses SSH] → it is a standard
  documented option and breaks only on hosts with `requiretty`; the user opted in
  from their repository.
- [A future Ansible renames or adds an option] → the table is explicit, so an
  unknown key is ignored and a renamed one stops applying; the discard log
  shows it. Revisit the table when the pinned Ansible version is bumped.
- [Behaviour change for existing repositories] → only for those that already set
  one of these keys, and in the direction they asked for.

## Migration Plan

No data or API migration. Ship with the service; roll back by reverting the
change (the file goes back to being empty). Docs are updated in the same change:
`docs/docs/ejecucion/`, `docs/docs/guias/`, the `reglas` catalog type, the served
skills in `docs/skills/` and the `AGENTS.md` paragraph that says the repository's
`ansible.cfg` is ignored.
