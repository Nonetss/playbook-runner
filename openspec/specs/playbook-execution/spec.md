# Playbook Execution

## Purpose
Stream `ansible-runner` executions of a user-selected playbook against a user-selected set of devices/groups, authenticated via the existing session and resolved server-side through the backend. (TBD)
## Requirements
### Requirement: Run endpoint accepts a playbook and inventory selection
The Ansible service SHALL expose `POST /api/v0/run` that accepts a body of `{ playbookId: uuid, inventoryIds: [{ id: uuid, type: "group" | "device" }] }` and executes the identified playbook against the resolved hosts.

#### Scenario: Valid run request is accepted
- **WHEN** an authenticated client POSTs a body with a `playbookId` and a non-empty `inventoryIds` list
- **THEN** the service SHALL begin executing the playbook and respond with an event stream

#### Scenario: Malformed request is rejected
- **WHEN** a client POSTs a body missing `playbookId` or `inventoryIds`
- **THEN** the service SHALL reject the request with a validation error and SHALL NOT start a run

### Requirement: Run requires authentication
The run endpoint SHALL require a valid session, validated the same way as other authenticated routes, and SHALL forward the caller's session cookie when resolving the run against the backend.

#### Scenario: Missing or invalid session
- **WHEN** a request without a valid session cookie calls `POST /api/v0/run`
- **THEN** the service SHALL respond with `401` and SHALL NOT start a run

### Requirement: Resolve the run via the backend
The service SHALL resolve the run request into a runnable bundle by calling the backend's resolve procedure, which returns the playbook content together with the de-duplicated target hosts and their credentials. The service SHALL NOT query the database directly.

#### Scenario: Selection of a group expands to its devices
- **WHEN** the `inventoryIds` includes an entry with `type: "group"`
- **THEN** the resolved host list SHALL include every device that belongs to that group

#### Scenario: Overlapping device and group selections are de-duplicated
- **WHEN** a device is selected directly and also belongs to a selected group
- **THEN** the resolved host list SHALL include that device exactly once

#### Scenario: Device without a credential
- **WHEN** the resolved selection contains a device that has no associated credential
- **THEN** the service SHALL surface an error and SHALL NOT start a partial run

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

### Requirement: Stream execution events
The run endpoint SHALL stream Ansible execution events to the client over Server-Sent Events, emitting one message per event, a terminal `done` message carrying the final `status`, `rc`, and `ok` flag, and an `error` message if execution cannot complete.

#### Scenario: Events stream during execution
- **WHEN** the playbook executes
- **THEN** the client SHALL receive an SSE message for each Ansible event followed by a terminal `done` message

#### Scenario: Failure is reported on the stream
- **WHEN** execution raises an error before completion
- **THEN** the service SHALL emit an SSE `error` message describing the failure

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

