## Why

The hosts of a run are chosen when it starts, yet a play whose `hosts` is anything but `all` matches nothing and is skipped, which the edit page has to warn about. The selection made in the interface should be the only thing that decides where a playbook runs.

## What Changes

- **BREAKING** Every play runs on the run's selection, whatever its `hosts` says, including `localhost` and patterns with variables or exclusions.
- The runner rewrites `hosts` in the run's own copy of the playbook and of the playbooks it imports; stored playbooks and Git repositories are not changed.
- Remove the `hosts: all` warning from the playbook edit page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `playbook-execution`: plays target the run's selection.

## Impact

- `apps/ansible/app/services/ansible/play_targets.py` (new) and `materialize.py`.
- `apps/frontend` edit page and `playbooks` locale.
- A playbook that used `hosts: localhost` to run on the runner now needs `delegate_to: localhost`. A playbook with plays for different groups runs each of them on the whole selection.
- Ad-hoc commands and scripts are unaffected: they have no playbook.
