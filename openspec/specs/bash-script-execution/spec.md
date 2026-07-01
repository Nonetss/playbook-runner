# bash-script-execution

## Purpose

TBD

## Requirements

### Requirement: Resolve a stored script and inventory selection
The backend SHALL expose a resolve procedure that, given a `scriptId` and an inventory selection, returns the script's `name` and `content` together with the de-duplicated list of target hosts with credentials. Group selections SHALL expand to their member devices, reusing the same host-resolution logic as playbook and command runs. The service SHALL NOT query the database directly.

#### Scenario: Script and hosts are resolved
- **WHEN** an authenticated caller resolves a valid `scriptId` with a non-empty inventory selection
- **THEN** the result SHALL contain the script content and every resolved target host

#### Scenario: Unknown script is rejected
- **WHEN** the `scriptId` does not exist
- **THEN** the resolve SHALL fail with a not-found error and SHALL NOT return hosts

#### Scenario: Device without a credential
- **WHEN** the resolved selection contains a device that has no associated credential
- **THEN** the resolve SHALL surface an error and SHALL NOT return a partial host list

### Requirement: Execute a stored script via the Ansible script module
The Ansible service SHALL expose `POST /api/v0/script` that accepts `{ scriptId: uuid, inventory: [{ id, type }], become: boolean, forks?: number }`, resolves the script and hosts via the backend, materializes the script content to a file, and executes it against the resolved hosts using the Ansible `script` module (which transfers and runs the script on each host). Privilege escalation SHALL be applied when `become` is true. Materialized script and key files SHALL be deleted after the run.

#### Scenario: Script runs against every resolved host
- **WHEN** the resolved selection contains multiple hosts
- **THEN** the script SHALL be executed against each host and events SHALL be emitted per host

#### Scenario: Privilege escalation is applied
- **WHEN** the request sets `become: true`
- **THEN** the script SHALL run with privilege escalation enabled

#### Scenario: Authentication is required
- **WHEN** a request without a valid session cookie calls `POST /api/v0/script`
- **THEN** the service SHALL respond with `401` and SHALL NOT start a run

#### Scenario: Secrets and script are cleaned up
- **WHEN** the run finishes, whether it succeeds or fails
- **THEN** every materialized private key file and the materialized script file SHALL be deleted

### Requirement: Stream script execution events
The script endpoint SHALL stream execution events to the client over Server-Sent Events, emitting one message per Ansible event, a terminal `done` message carrying the final `status`, `rc`, and `ok` flag, and an `error` message if execution cannot start or complete — using the same wire format as playbook and command runs.

#### Scenario: Events stream during execution
- **WHEN** the script executes
- **THEN** the client SHALL receive an SSE message for each Ansible event followed by a terminal `done` message

#### Scenario: Per-host output is delivered
- **WHEN** a host returns stdout or a non-zero return code
- **THEN** the corresponding SSE event SHALL carry that host's `stdout`, `stderr`, and `rc`

#### Scenario: Failure is reported on the stream
- **WHEN** execution raises an error before completion
- **THEN** the service SHALL emit an SSE `error` message describing the failure

### Requirement: Dedicated script run page
The frontend SHALL provide a run page for a stored script where the user selects inventory devices/groups, toggles `become`, sets `forks`, executes the script, and watches the live event stream in a console — mirroring the playbook run flow.

#### Scenario: Run page is reachable from a script
- **WHEN** a user chooses to run a stored script
- **THEN** the app SHALL open the script's run page at its own route

#### Scenario: Run is disabled without a selection
- **WHEN** no host is selected
- **THEN** the execute action SHALL be disabled

#### Scenario: Live console renders streamed events
- **WHEN** the user executes the script
- **THEN** the page SHALL render each streamed event in a console and show a terminal success/failure state when the stream ends
