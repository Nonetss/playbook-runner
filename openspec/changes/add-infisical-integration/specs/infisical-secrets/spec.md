## Purpose

Lets playbooks read secrets from Infisical at run time, using machine identity credentials that are stored encrypted and delivered only to the runs that explicitly reference them.

## ADDED Requirements

### Requirement: Infisical connections can be managed
The system SHALL let any authenticated, non-pending user create, list, get, update and delete Infisical connections. A connection SHALL have a non-empty `name`, an `http` or `https` `url`, a non-empty `clientId` and a non-empty `clientSecret`.

#### Scenario: Creating a connection
- **WHEN** an authenticated user calls `v1.infisicalConnections.create` with a valid name, URL, client id and client secret
- **THEN** the connection SHALL be stored and returned

#### Scenario: Invalid URL
- **WHEN** a user creates or updates a connection with a URL whose scheme is not `http` or `https`
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL be written

#### Scenario: Pending or anonymous caller
- **WHEN** an anonymous or `pending` caller calls any `v1.infisicalConnections` procedure
- **THEN** the call SHALL fail with `UNAUTHORIZED` or `FORBIDDEN` respectively

#### Scenario: Unknown connection
- **WHEN** a user gets, updates or deletes a connection id that does not exist
- **THEN** the call SHALL fail with `NOT_FOUND`

### Requirement: Client secrets are protected
The system SHALL encrypt the client secret at rest with the same mechanism as SSH private keys and SHALL decrypt it only when building a run for the Ansible service. No procedure SHALL return the client secret. The client secret SHALL be optional on update; when omitted, the stored secret SHALL be kept unchanged.

#### Scenario: Stored encrypted
- **WHEN** a connection is created or its secret is updated
- **THEN** the database column SHALL contain a versioned ciphertext and not the secret text

#### Scenario: Never returned
- **WHEN** any client calls a `v1.infisicalConnections` procedure
- **THEN** the response SHALL NOT contain a `clientSecret` field

#### Scenario: Update without a new secret
- **WHEN** a user updates a connection's name and omits `clientSecret`
- **THEN** the name SHALL change and the stored secret SHALL remain the same

### Requirement: A connection in use cannot be deleted
The system SHALL refuse to delete a connection referenced by any job, so a scheduled job never silently loses its credentials.

#### Scenario: Referenced by a job
- **WHEN** a user deletes a connection that at least one job references
- **THEN** the call SHALL fail with `CONFLICT` and the connection SHALL remain

#### Scenario: Not referenced
- **WHEN** a user deletes a connection no job references
- **THEN** the connection SHALL be deleted

### Requirement: Runs can reference a connection
A job and an interactive playbook run SHALL accept an optional connection id. Job output SHALL include the referenced connection id, or null. Ad-hoc commands, scripts and pings SHALL NOT accept a connection.

#### Scenario: Job saved with a connection
- **WHEN** a user creates or updates a job with the id of an existing connection
- **THEN** the job SHALL store the reference and return it

#### Scenario: Job saved with an unknown connection
- **WHEN** a user creates or updates a job with a connection id that does not exist
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL be written

#### Scenario: Interactive run with an unknown connection
- **WHEN** a user starts `v1.run.run` with a connection id that does not exist
- **THEN** the call SHALL fail with `NOT_FOUND` and no run SHALL start

### Requirement: Credentials reach only the runs that reference them
For a run that references a connection, the system SHALL expose `INFISICAL_URL`, `INFISICAL_AUTH_METHOD` (set to `universal_auth`), `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` and `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` in the environment of that run's Ansible process. A run with no connection SHALL NOT be given these variables by the system. The variables SHALL be removed from disk with the rest of the run's scratch directory when the run ends. User extra vars SHALL NOT be able to change them.

#### Scenario: Run with a connection
- **WHEN** a playbook runs with a connection and calls the `infisical.vault.read_secrets` lookup with no credentials
- **THEN** the lookup SHALL authenticate against that connection's Infisical URL with its client id and secret

#### Scenario: Scheduled job
- **WHEN** the scheduler or a manual trigger runs a job that references a connection
- **THEN** the run SHALL receive that connection's credentials, exactly as an interactive run does

#### Scenario: Run without a connection
- **WHEN** a playbook runs with no connection
- **THEN** the runner SHALL pass no `INFISICAL_*` variable to Ansible

#### Scenario: Run finished or cancelled
- **WHEN** a run with a connection ends, fails or is cancelled
- **THEN** no file holding the client secret SHALL remain in the run's scratch directory location

### Requirement: The client secret is masked in run output
The runner SHALL replace the connection's client secret with a fixed mask in every string of a run's events before they are logged or sent to the backend. This masking is a best-effort defence for that literal value; it SHALL NOT be presented as protecting transformed values or the secrets a playbook reads from Infisical.

#### Scenario: Playbook prints the client secret
- **WHEN** a task's `msg`, `stdout` or `stderr` contains the client secret literally
- **THEN** the event sent to the backend and the runner's logs SHALL contain the mask instead of the value

#### Scenario: Run without a connection
- **WHEN** a run has no connection
- **THEN** its events SHALL be forwarded unchanged

### Requirement: The runner image provides the collection
The production and development runner images SHALL include a pinned version of the `infisical.vault` collection and of the `infisicalsdk` Python package, available to inline and Git-sourced playbooks with no installation at run time.

#### Scenario: Inline playbook
- **WHEN** an inline playbook uses an `infisical.vault` lookup in a built runner image
- **THEN** Ansible SHALL resolve the plugin and its Python dependency

#### Scenario: Git-sourced playbook
- **WHEN** a Git-sourced playbook, which runs with a runner-controlled `ANSIBLE_CONFIG`, uses the same lookup
- **THEN** Ansible SHALL resolve the plugin and its Python dependency

### Requirement: Operators are told the limits
The connection page and the project website guide SHALL state that playbooks must use `no_log` on tasks that handle secrets, because task output is stored in the run history, and that anyone able to run a playbook with a connection can read its credentials, so identities need least-privilege access in Infisical. The guide SHALL state that the collection's lookups read the injected variables while its modules do not, and that modules need `delegate_to: localhost`.

#### Scenario: Connection page
- **WHEN** a user opens the Infisical connections page
- **THEN** the page SHALL show the `no_log` and least-privilege guidance

#### Scenario: Website guide
- **WHEN** a reader opens the Infisical guide in English or Spanish
- **THEN** it SHALL include a working lookup example, the limits above and the lookup versus module difference
