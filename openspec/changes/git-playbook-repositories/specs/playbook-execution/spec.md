## MODIFIED Requirements

### Requirement: Materialize playbook and credentials for execution
The service SHALL write the resolved playbook content to a playbook file and each distinct credential's private key to a key file with owner-only permissions, and SHALL build the Ansible inventory with per-host connection variables (host address, username, SSH port when present, and private key file). For a Git-sourced playbook the service SHALL instead export the repository tree at the requested commit into the run's scratch directory and run the playbook at its repository path with that tree as the project directory, ignoring any `ansible.cfg` from the repository. Materialized playbook files, exported trees and key files SHALL be removed after the run finishes.

#### Scenario: Per-host connection variables are set
- **WHEN** the run is materialized for a device with an address, username, SSH port, and credential
- **THEN** the host entry SHALL set `ansible_host`, `ansible_user`, `ansible_port`, and `ansible_ssh_private_key_file` accordingly

#### Scenario: Secrets are cleaned up
- **WHEN** the run finishes, whether it succeeds or fails
- **THEN** the materialized playbook file, any exported repository tree and private key files SHALL be deleted

#### Scenario: Git playbook uses repository files
- **WHEN** a Git-sourced playbook at `site.yml` includes a role from `roles/web`
- **THEN** the run SHALL resolve the role from the exported tree at the synced commit

#### Scenario: Repository ansible.cfg is ignored
- **WHEN** the exported tree contains an `ansible.cfg`
- **THEN** the run SHALL use the runner-controlled configuration instead

## ADDED Requirements

### Requirement: Git runs are pinned to the synced commit
The backend SHALL run a Git-sourced playbook at its repository's last synced
commit, SHALL refuse to run a playbook flagged as missing with
`PRECONDITION_FAILED`, and SHALL record the commit on the job run.

#### Scenario: Branch moved after sync
- **WHEN** the remote branch has new commits that were not synced
- **THEN** the run SHALL still use the last synced commit

#### Scenario: Job run records the commit
- **WHEN** a job whose playbook is Git-sourced runs
- **THEN** the job run SHALL store the commit SHA it executed

#### Scenario: Missing playbook
- **WHEN** a user runs a Git-sourced playbook flagged as missing
- **THEN** the system SHALL reject the run with `PRECONDITION_FAILED`
