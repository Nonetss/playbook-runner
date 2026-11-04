## ADDED Requirements

### Requirement: A run that fails on the playbook itself says why

When a run fails because Ansible cannot load or process the playbook, and no host reported a failure, the system SHALL report Ansible's message to the user: as the error of an interactive run and in the `error` of a job run. A run in which a task or a host failed SHALL keep reporting that result as before.

#### Scenario: Invalid playbook in an interactive run

- **WHEN** a user runs a playbook that uses a module that does not exist
- **THEN** the run SHALL fail with Ansible's message naming that module

#### Scenario: Variable file that cannot be decrypted in a job

- **WHEN** a job runs a playbook with an encrypted `vars_files` entry and its repository has no matching password
- **THEN** the job run SHALL end as failed, with Ansible's message in its `error`

#### Scenario: Run refused before Ansible

- **WHEN** the runner ends an interactive run with an error of its own, such as a secret it cannot fetch
- **THEN** the caller SHALL receive that message, not a generic server error

#### Scenario: Failed task

- **WHEN** a task fails on a host
- **THEN** the run SHALL end with its normal failed result and the task's own message
