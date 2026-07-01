# remote-command-execution

## Purpose

TBD

## Requirements

### Requirement: Command endpoint accepts an inventory selection and a command
The Ansible service SHALL expose `POST /api/v0/command` that accepts a body of `{ inventory: [{ id: uuid, type: "group" | "device" }], command: string, module: "shell" | "command", become: boolean, forks?: number }` and executes the given command as an ad-hoc Ansible module against the resolved hosts, without requiring a playbook.

#### Scenario: Valid command request is accepted
- **WHEN** an authenticated client POSTs a non-empty `inventory` list, a non-empty `command`, and a valid `module`
- **THEN** the service SHALL begin executing the command and respond with an event stream

#### Scenario: Empty command is rejected
- **WHEN** a client POSTs a body whose `command` is empty or whitespace-only
- **THEN** the service SHALL reject the request with a validation error and SHALL NOT start a run

#### Scenario: Empty inventory is rejected
- **WHEN** a client POSTs a body with an empty `inventory` list
- **THEN** the service SHALL reject the request with a validation error and SHALL NOT start a run

### Requirement: Command execution requires authentication
The command endpoint SHALL require a valid session, validated the same way as the playbook run endpoint, and SHALL forward the caller's session cookie when resolving the target hosts against the backend.

#### Scenario: Missing or invalid session
- **WHEN** a request without a valid session cookie calls `POST /api/v0/command`
- **THEN** the service SHALL respond with `401` and SHALL NOT start a run

### Requirement: Resolve target hosts via the backend without a playbook
The service SHALL resolve the inventory selection into a de-duplicated list of hosts with credentials by calling a backend resolve procedure that does not require a `playbookId`. Group selections SHALL expand to their member devices. The service SHALL NOT query the database directly.

#### Scenario: Group selection expands to its devices
- **WHEN** the `inventory` includes an entry with `type: "group"`
- **THEN** the resolved host list SHALL include every device that belongs to that group

#### Scenario: Overlapping device and group selections are de-duplicated
- **WHEN** a device is selected directly and also belongs to a selected group
- **THEN** the resolved host list SHALL include that device exactly once

#### Scenario: Device without a credential
- **WHEN** the resolved selection contains a device that has no associated credential
- **THEN** the service SHALL surface an error and SHALL NOT start a partial run

### Requirement: Execute the command as an ad-hoc module
The service SHALL run the command via `ansible-runner` in ad-hoc mode using the requested module (`shell` or `command`) with the command string as the module argument, targeting all resolved hosts, and SHALL apply privilege escalation when `become` is true. The service SHALL materialize each distinct credential's private key to an owner-only key file and build the inventory with per-host connection variables, deleting all materialized key files after the run.

#### Scenario: Command runs against every resolved host
- **WHEN** the resolved selection contains multiple hosts
- **THEN** the command SHALL be executed against each host and events SHALL be emitted per host

#### Scenario: Privilege escalation is applied
- **WHEN** the request sets `become: true`
- **THEN** the ad-hoc execution SHALL run the module with privilege escalation enabled

#### Scenario: Secrets are cleaned up
- **WHEN** the run finishes, whether it succeeds or fails
- **THEN** every materialized private key file SHALL be deleted

### Requirement: Stream command execution events
The command endpoint SHALL stream execution events to the client over Server-Sent Events, emitting one message per Ansible event, a terminal `done` message carrying the final `status`, `rc`, and `ok` flag, and an `error` message if execution cannot start or complete.

#### Scenario: Events stream during execution
- **WHEN** the command executes
- **THEN** the client SHALL receive an SSE message for each Ansible event followed by a terminal `done` message

#### Scenario: Per-host output is delivered
- **WHEN** a host returns stdout or a non-zero return code
- **THEN** the corresponding SSE event SHALL carry that host's `stdout`, `stderr`, and `rc`

#### Scenario: Failure is reported on the stream
- **WHEN** execution raises an error before completion
- **THEN** the service SHALL emit an SSE `error` message describing the failure

### Requirement: Dedicated command page
The frontend SHALL provide a dedicated page, reachable from a top-level navbar link and separate from the playbook run flow, where a user selects inventory devices/groups, enters a command, chooses the module, toggles `become`, executes the command, and watches the live event stream in a console.

#### Scenario: Page is reachable from the navbar
- **WHEN** an authenticated user opens the app
- **THEN** a navbar link SHALL navigate to the command page at its own route

#### Scenario: Run is disabled without a valid selection and command
- **WHEN** no host is selected or the command field is empty
- **THEN** the execute action SHALL be disabled

#### Scenario: Live console renders streamed events
- **WHEN** the user executes a command
- **THEN** the page SHALL render each streamed event in a console and show a terminal success/failure state when the stream ends
