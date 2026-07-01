## MODIFIED Requirements

### Requirement: Resolve a stored script and inventory selection

The backend SHALL expose a resolve procedure that, given a `scriptId` and an inventory selection, returns the script's `name`, `content`, and `language` together with the de-duplicated list of target hosts with credentials. When a stored script has no persisted language, the resolved bundle SHALL report `language` as `bash`. Group selections SHALL expand to their member devices, reusing the same host-resolution logic as playbook and command runs. The service SHALL NOT query the database directly.

#### Scenario: Script, language, and hosts are resolved

- **WHEN** an authenticated caller resolves a valid `scriptId` with a non-empty inventory selection
- **THEN** the result SHALL contain the script content, its `language`, and every resolved target host

#### Scenario: Unknown script is rejected

- **WHEN** the `scriptId` does not exist
- **THEN** the resolve SHALL fail with a not-found error and SHALL NOT return hosts

#### Scenario: Device without a credential

- **WHEN** the resolved selection contains a device that has no associated credential
- **THEN** the resolve SHALL surface an error and SHALL NOT return a partial host list

### Requirement: Execute a stored script via the Ansible script module

The Ansible service SHALL expose `POST /api/v0/script` that accepts `{ scriptId: uuid, inventory: [{ id, type }], become: boolean, forks?: number }`, resolves the script and hosts via the backend, materializes the script content to a file whose extension matches the resolved `language` (`.sh` for `bash`, `.py` for `python`), and executes it against the resolved hosts using the Ansible `script` module (which transfers and runs the script on each host). When the content does not begin with a shebang, the service SHALL prepend the interpreter shebang matching the language (`#!/usr/bin/env bash` or `#!/usr/bin/env python3`) so the script runs under the selected interpreter. Privilege escalation SHALL be applied when `become` is true. Materialized script and key files SHALL be deleted after the run.

#### Scenario: Bash script runs under bash

- **WHEN** a resolved script has `language` `bash`
- **THEN** the materialized file SHALL run under a bash interpreter on each host

#### Scenario: Python script runs under python3

- **WHEN** a resolved script has `language` `python` and its content has no shebang
- **THEN** the service SHALL ensure a `python3` interpreter runs the script on each host

#### Scenario: Author-provided shebang is preserved

- **WHEN** the script content already begins with a `#!` shebang line
- **THEN** the service SHALL NOT prepend another shebang and SHALL run the script as authored

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

### Requirement: Dedicated script run page

The frontend SHALL provide a run page for a stored script where the user selects inventory devices/groups, toggles `become`, sets `forks`, executes the script, and watches the live event stream in a console — mirroring the playbook run flow. The page SHALL display the script's `language` so the user knows which interpreter it will run under.

#### Scenario: Run page is reachable from a script

- **WHEN** a user chooses to run a stored script
- **THEN** the app SHALL open the script's run page at its own route

#### Scenario: Language is shown on the run page

- **WHEN** the run page renders a stored script
- **THEN** it SHALL indicate whether the script runs as `bash` or `python`

#### Scenario: Run is disabled without a selection

- **WHEN** no host is selected
- **THEN** the execute action SHALL be disabled

#### Scenario: Live console renders streamed events

- **WHEN** the user executes the script
- **THEN** the page SHALL render each streamed event in a console and show a terminal success/failure state when the stream ends
