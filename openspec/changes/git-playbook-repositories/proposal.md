## Why

Today every playbook is a single YAML document stored in Postgres and edited in
the browser. Teams that already keep their Ansible code in Git (with roles,
templates, `group_vars`, `files/`, code review and history) have to copy-paste
it into the UI and keep both copies in sync by hand. Letting a Git repository be
the source of truth for playbooks removes that duplication and makes the tool
usable for existing Ansible projects.

## What Changes

- New **playbook repository** resource: name, clone URL, branch, optional
  subdirectory to scan, optional SSH credential (reused from the existing
  credentials store) for private repositories.
- New **sync** action per repository: the Ansible service fetches the branch
  into a cached mirror, reports the head commit and the playbook files it found;
  the backend upserts one read-only playbook per file (`source = git`,
  keyed by repository + path) and flags the ones that disappeared.
- Git-backed playbooks appear next to the inline ones in the playbook browser,
  grouped by repository, and are **read-only** in the UI (view, run, schedule;
  no edit, move or delete).
- **Running a Git playbook** checks out the repository at the last synced
  commit into the run's scratch directory and runs the playbook from there, so
  relative roles, templates, `group_vars` and `files/` work. Inline playbooks
  run exactly as today.
- Job runs record the commit a Git playbook ran at.
- The Ansible image gains the `git` binary; the gRPC contract gains a
  `SyncRepository` RPC and a Git source on the playbook message.
- Out of scope for this change: webhooks / auto-sync, HTTPS token auth,
  `requirements.yml` (Galaxy roles/collections) installation, pushing edits
  back to Git.

## Capabilities

### New Capabilities
- `playbook-repositories`: register Git repositories, sync them, discover
  playbook files, and expose the synced playbooks as read-only resources.

### Modified Capabilities
- `playbook-management`: playbooks now have a source (`inline` or `git`);
  Git-sourced playbooks cannot be edited, moved or deleted by hand.
- `playbook-execution`: materialization checks out the repository at the
  synced commit for Git-sourced playbooks instead of writing a single file.

## Impact

- **DB (user generates the migration)**: new `playbook_repositories` table;
  `playbooks` gains `source`, `repository_id`, `path`, `missing`;
  `job_runs` gains `commit_sha`.
- **Proto** `proto/run.proto`: `SyncRepository` RPC, `GitSource` on
  `Playbook`; regenerate TS and Python stubs.
- **API** `packages/api/src/v1`: new `repositories` feature
  (CRUD + `sync`), guards in `playbooks` handlers, Git branch in
  `run/resolve.ts`, commit recording in `jobs/executor.ts`.
- **Ansible service** `apps/ansible`: new Git service (mirror cache under
  `STATE_DIR/repos`, checkout per run, SSH key handling reusing
  `SSH_HOST_KEY_POLICY`), `materialize.py` branch; Dockerfile installs `git`.
- **Frontend** `features/playbooks` (+ new repository dialogs/definition),
  i18n strings, surfaces registry if a repositories page is added.
- **Security**: repository contents run on managed hosts and an in-repo
  `ansible.cfg` could change runner behaviour; see design.
