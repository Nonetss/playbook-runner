## Context

See `proposal.md` for the motivation and `specs/playbook-repository-roles/spec.md` for the required behavior.

Current state:

- `_materialize_git` (`apps/ansible/app/services/ansible/materialize.py`) exports the whole pinned commit to `run_dir/project` and sets `ANSIBLE_CONFIG` to an empty runner-owned file, so the repository's `roles_path` is ignored on purpose. That protection stays.
- `_new_run_dir` only replaces `/` and spaces in its label, and a Git playbook's name is its path, so a run directory can contain `:`.
- `mirror.ensure_commit` restores a pinned commit if the mirror lost it, `mirror.list_tree` lists regular files, and `discover.py` already has a YAML loader that tolerates Ansible tags.
- `apps/frontend/.../repository-section.tsx` renders one repository in the playbook browser, with a collapsible body.

Checks run while planning, with the project's Ansible (core 2.21.1) and a local-connection playbook at `playbooks/site.yml` with its role in a root `roles/`:

- Through `ansible_runner.run`, without the variable: the run fails.
- With `ANSIBLE_ROLES_PATH` holding one absolute path, or two separated by `:` in either order: the run succeeds.
- `ansible_runner` only rewrites `ANSIBLE_ROLES_PATH` in streamer mode, which this service does not use.

## Goals / Non-Goals

**Goals:**

- Make the usual repository layouts work without any per-repository configuration.
- Show the list from the same commit a run would use.
- Keep runs independent of the listing: a listing failure never affects execution.

**Non-Goals:**

- Guaranteeing that every listed role can be resolved by every playbook of the repository.
- Reading anything from the repository's `ansible.cfg`, even only `roles_path`.
- Showing the files inside a role.

## Decisions

### Search path derived from the playbook's location

`_materialize_git` walks from the playbook's directory up to `project_dir`, keeps each existing `roles/` directory, nearest first, and sets `ANSIBLE_ROLES_PATH` only if it found any. The check resolves each candidate and requires it to stay inside `project_dir`, so a `roles` symlink cannot point outside the tree.

Alternatives:

- A fixed `<project>/roles`: misses a `roles/` under an intermediate directory, such as a repository `subdir`.
- A new repository setting: adds a schema change and a form field for a layout that can be inferred.
- Honoring only `roles_path` from `ansible.cfg`: reopens a file the runner ignores on purpose, and that value can point outside the repository.

No proto change is needed for runs, because the playbook path is already known.

When the variable is set, it replaces Ansible's default role paths (`~/.ansible/roles`, `/usr/share/ansible/roles`, `/etc/ansible/roles`). The images install only a collection, not roles, so nothing that works today depends on them.

### Keep `:` out of the search path

`_new_run_dir` uses the existing `_safe_prefix` for its label, which removes `:` from everything above the repository tree. A `roles/` under a repository directory whose name contains `:` is skipped rather than failing the run: Ansible still finds a `roles/` next to the playbook on its own.

### Read roles on demand with a new RPC

`ListRepositoryRoles` takes the repository id, URL, commit, subdirectory and optional key, calls `ensure_commit` and then a new `discover_roles`, in the same module as playbook discovery. `v1.repositories.roles` calls it with the repository's `lastCommitSha`.

Alternatives:

- Returning roles in `SyncRepositoryResponse` and storing them: requires a table and a migration, and creates a second copy of data that the commit already defines.
- Returning roles in `SyncRepositoryResponse` without storing them: the list would be lost after the sync response.

Like the run path, the RPC takes neither a run slot nor a sync slot. It only reads from the mirror in the normal case, and `repo_lock` already serializes a fetch for the same repository. It does not write `lastSyncError`, which belongs to explicit syncs.

The backend returns early with `{ commit: null, roles: [], requirementsFiles: [] }` when `lastCommitSha` is null, without calling the service. It reuses `toSyncError` for errors and the sync timeout, since `ensure_commit` may have to fetch.

### What counts as a role

`discover_roles` goes through `list_tree` for the whole commit, because a `roles/` above `subdir` must be seen too. For each path:

- It takes the first `roles` segment, so nested roles are ignored. A hidden segment or a `collections` segment before it rules the path out.
- The directory before `roles` must be the configured subdirectory, one of its ancestors, or a directory inside it.
- The rest must be `<name>/tasks/main.{yml,yaml}` or `<name>/meta/main.{yml,yaml}`.

Roles are sorted by path and capped at `MAX_ROLES` (500), matching `MAX_PLAYBOOKS`. The description comes from a `meta/main` blob within `MAX_PLAYBOOK_BYTES`, read with the existing tag-tolerant loader, and is capped at 500 characters. Any read or parse problem means no description, never a failed listing.

`list_tree` skips symlinks, so a role whose only marker file is a symlink is not listed, although Ansible could still run it.

### Dependency files are detected, not processed

`requirements_files` is filled from the same tree listing by path only, at the locations the spec names. Their content is never read. Detection is enough for the warning, and it adds no parsing to maintain.

### UI inside the repository section

A `useRepositoryRoles(repository)` hook wraps `orpc.repositories.roles.queryOptions`, enabled only when the section is expanded and the repository has a commit. `useRepositorySync` adds the roles key to `extraInvalidate`.

The roles block goes in the collapsible body under the playbook grid:

- A label-role heading, then a flat list with name and path in the data role and the description in the meta role.
- `InlineAlert` for the dependency warning and for a load error.
- Nothing at all when there are no roles, no dependency files and no error.

It does not use `EntityCardGrid`: a role has no actions and no detail route, so cards would suggest interaction that does not exist.

## Risks / Trade-offs

- [A role is listed that a given playbook cannot resolve, such as `infra/roles/x` for a playbook at the repository root] → The list shows each role's path, and the run reports Ansible's role-not-found error.
- [Listing reads the whole tree on each request] → The query only runs for expanded sections, and TanStack Query caches it. `git ls-tree` on a size-limited mirror is cheap, and only `meta/main` blobs are read.
- [An expanded repository whose mirror was lost triggers a fetch from a page view] → This only happens after losing the volume, it restores the mirror the next run would need anyway, and `repo_lock` serializes it.
- [A `requirements.yml` is reported even if it is unrelated to roles] → The warning only names the file and says dependencies are not installed, so a false alarm costs little.
- [Replacing the default role paths could break a custom image that installs roles there] → The variable is only set when the repository has a `roles/` on the walk, and custom images are not a supported setup today. Mention it in the docs.

## Migration Plan

No data migration. Deploy the Ansible service and the backend together, as with any proto change: a backend newer than the service gets `UNIMPLEMENTED` on the listing, which the UI shows as a roles load error without affecting playbooks or runs. Rollback is reverting the code.
