## Why

Git-sourced playbooks can only use Ansible roles when `roles/` sits next to the playbook: the common layout of `playbooks/site.yml` with `roles/` at the repository root fails with "role not found", because the runner deliberately ignores the repository's `ansible.cfg` and with it `roles_path`. The UI also gives no sign of which roles a repository contains, or that roles declared in `requirements.yml` will not be available.

## What Changes

- Git runs resolve roles from every `roles/` directory between the playbook and the repository root, through a runner-controlled `ANSIBLE_ROLES_PATH`. The repository's `ansible.cfg` stays ignored.
- The runner lists the roles of a commit through a new gRPC `ListRepositoryRoles` RPC: name, path and the optional description from `meta/main.yml`, plus any `requirements.yml` files it finds.
- A new `v1.repositories.roles` endpoint returns that list for the repository's last synced commit. Nothing is stored, so the list always matches what a run would use.
- The repository section of the Playbooks page shows the roles read-only, and warns when a `requirements.yml` exists because its dependencies are not installed.
- Run directories get a filename-safe label, so a `:` in a playbook name cannot split `ANSIBLE_ROLES_PATH`.

Non-goals:

- Creating or editing roles from the UI, and roles on inline playbooks. Git stays the source of truth.
- Installing `requirements.yml` dependencies with `ansible-galaxy`. The warning makes this limit visible, and installation can come in a later change.
- Running a role directly without a playbook.

## Capabilities

### New Capabilities

- `playbook-repository-roles`: resolving Ansible roles during Git runs, listing a repository's roles at its synced commit, and showing them read-only in the UI with a warning about uninstalled dependencies.

### Modified Capabilities

None. Playbook discovery, sync and execution keep their existing requirements.

## Impact

- `proto/run.proto`: new `ListRepositoryRoles` RPC and messages, in the existing `run` package, so the gateway's `/run.*` route already covers it.
- `apps/ansible`: `services/ansible/materialize.py`, `services/git/discover.py`, `grpc/services/runner.py` and their tests.
- `packages/api`: `v1/repositories` (`router`, `handler`, `input`, `output`, `sync`) and its tests.
- `apps/frontend`: `features/playbooks` (`repository-section.tsx`, `use-repositories.ts`, types) and the `playbooks` locale files.
- Docs: `AGENTS.md` and `apps/site` docs in English and Spanish.
- No database schema change or migration, and no new dependency.
