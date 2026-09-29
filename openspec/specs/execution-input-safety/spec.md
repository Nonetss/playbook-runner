# Execution Input Safety

## Purpose

Validate user-supplied execution inputs (extra vars, inventory names, host-derived file names) so they cannot alter connection, privilege, or filesystem behaviour of Ansible runs.

## Requirements

### Requirement: Reserved extra vars are rejected
User-supplied extra vars for playbook runs (`v1.run.run`) and jobs (`v1.jobs.create`, `v1.jobs.update`) SHALL NOT contain keys that change connection, privilege or interpreter behaviour. Any key starting with `ansible_` (case-insensitive) SHALL be rejected with a validation error. The Ansible service SHALL independently drop or reject such keys from `request.extravars` before merging them with its own defaults.

#### Scenario: Backend rejects a connection override
- **WHEN** a client submits a run with extravars `{ "ansible_ssh_common_args": "-o ProxyCommand=..." }`
- **THEN** the backend SHALL respond with a `BAD_REQUEST` validation error and SHALL NOT contact the Ansible service

#### Scenario: Runner enforces the rule independently
- **WHEN** the Ansible service receives a `RunBundle` request whose extravars include a key starting with `ansible_`
- **THEN** the service SHALL abort the run with an error event and SHALL NOT start `ansible-runner`

#### Scenario: Ordinary variables pass through
- **WHEN** a client submits extravars `{ "app_version": "1.2.3" }`
- **THEN** the variable SHALL be forwarded to the playbook unchanged

### Requirement: Inventory names are restricted
Device and group names SHALL match `^[A-Za-z0-9._-]{1,64}$` and SHALL NOT be `.` or `..`. Create and update procedures SHALL reject other names with a validation error.

#### Scenario: Traversal name is rejected
- **WHEN** a client creates a device named `../../x`
- **THEN** the system SHALL respond with a `BAD_REQUEST` validation error and SHALL NOT persist the device

#### Scenario: Valid name is accepted
- **WHEN** a client creates a device named `web-01.prod`
- **THEN** the device SHALL be created

### Requirement: Key files stay inside the run directory
The Ansible service SHALL derive key-file names from a sanitised form of the host name (characters outside `[A-Za-z0-9._-]` replaced, length bounded) so that every materialised key file resolves inside the run's key directory, regardless of the host name received.

#### Scenario: Legacy unsafe name
- **WHEN** a run is materialised for a host whose name contains `/` or `..` (e.g. a row created before validation)
- **THEN** the key file SHALL be created inside the run's key directory with owner-only permissions
