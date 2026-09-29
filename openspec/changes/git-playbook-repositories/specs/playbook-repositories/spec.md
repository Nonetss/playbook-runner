## ADDED Requirements

### Requirement: Register Git playbook repositories
The system SHALL let an authenticated user create, list, read, update and
delete playbook repositories with a name, a clone URL, a branch (default
`main`), an optional subdirectory and an optional SSH credential. Only
`https://`, `ssh://` and scp-like (`user@host:path`) URLs SHALL be accepted.

#### Scenario: Register a public repository
- **WHEN** a user creates a repository with an `https://` URL and no credential
- **THEN** the system SHALL persist it with branch `main` and no sync state

#### Scenario: Reject a local URL
- **WHEN** a user creates or updates a repository with a `file://` URL or a filesystem path
- **THEN** the system SHALL reject the request with `BAD_REQUEST`

#### Scenario: Reject an unknown credential
- **WHEN** a user references a credential id that does not exist
- **THEN** the system SHALL reject the request without changing the repository

### Requirement: Sync a repository
The system SHALL fetch the configured branch on demand, record the head commit
and sync time, and upsert one Git-sourced playbook per discovered playbook file,
keyed by repository and path so playbook ids stay stable across syncs.

#### Scenario: First successful sync
- **WHEN** a user syncs a repository whose branch contains `site.yml` and `web.yml` plays
- **THEN** the system SHALL create two Git-sourced playbooks with those paths and store the head commit

#### Scenario: Re-sync keeps ids
- **WHEN** a repository is synced again and `site.yml` still exists
- **THEN** the existing playbook SHALL keep its id and have its content updated

#### Scenario: File removed upstream
- **WHEN** a previously synced file no longer exists at the new commit
- **THEN** its playbook SHALL be flagged as missing instead of deleted

#### Scenario: Sync failure
- **WHEN** the fetch fails (unreachable host, authentication, unknown branch)
- **THEN** the system SHALL return an error, store the failure message on the repository and leave its playbooks and commit unchanged

### Requirement: Discover playbook files
Discovery SHALL consider `.yml`/`.yaml` files under the configured
subdirectory, excluding `roles/`, `group_vars/`, `host_vars/`, `collections/`
and hidden directories, and SHALL keep only files whose top-level YAML value is
a list of plays (mappings with `hosts` or `import_playbook`).

#### Scenario: Variables file is ignored
- **WHEN** the repository contains `group_vars/all.yml` and `vars.yml` holding a mapping
- **THEN** neither file SHALL be exposed as a playbook

### Requirement: Delete a repository
Deleting a repository SHALL delete its Git-sourced playbooks and its cached
mirror; jobs that referenced those playbooks SHALL keep existing with no
playbook.

#### Scenario: Delete with scheduled jobs
- **WHEN** a user deletes a repository whose playbook is used by a job
- **THEN** the repository and its playbooks SHALL be removed and the job's playbook SHALL be null
