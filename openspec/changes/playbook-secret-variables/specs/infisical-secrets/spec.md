## MODIFIED Requirements

### Requirement: Infisical connections can be managed
The system SHALL let any authenticated, non-pending user create, list, get, update and delete Infisical connections. A connection SHALL have a non-empty `name`, an `http` or `https` `url`, a non-empty `clientId`, a non-empty `clientSecret` and a non-empty `projectId`.

#### Scenario: Creating a connection
- **WHEN** an authenticated user calls `v1.infisicalConnections.create` with a valid name, URL, client id, client secret and project id
- **THEN** the connection SHALL be stored and returned

#### Scenario: Invalid URL
- **WHEN** a user creates or updates a connection with a URL whose scheme is not `http` or `https`
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL be written

#### Scenario: Missing project
- **WHEN** a user creates or updates a connection without a project id
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL be written

#### Scenario: Pending or anonymous caller
- **WHEN** an anonymous or `pending` caller calls any `v1.infisicalConnections` procedure
- **THEN** the call SHALL fail with `UNAUTHORIZED` or `FORBIDDEN` respectively

#### Scenario: Unknown connection
- **WHEN** a user gets, updates or deletes a connection id that does not exist
- **THEN** the call SHALL fail with `NOT_FOUND`

### Requirement: Client secrets are protected
The system SHALL encrypt the client secret at rest with the same mechanism as SSH private keys and SHALL decrypt it only to send it to the Ansible service, when building a run or when listing a connection's environments and secret names. No procedure SHALL return the client secret. The client secret SHALL be optional on update; when omitted, the stored secret SHALL be kept unchanged.

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
The system SHALL refuse to delete a connection referenced by any playbook or job, so a scheduled job never silently loses its secrets.

#### Scenario: Referenced by a playbook
- **WHEN** a user deletes a connection that at least one playbook references
- **THEN** the call SHALL fail with `CONFLICT` and the connection SHALL remain

#### Scenario: Referenced by a job
- **WHEN** a user deletes a connection that at least one job references
- **THEN** the call SHALL fail with `CONFLICT` and the connection SHALL remain

#### Scenario: Not referenced
- **WHEN** a user deletes a connection no playbook or job references
- **THEN** the connection SHALL be deleted

### Requirement: Runs can reference a connection
A job and an interactive playbook run SHALL accept an optional connection id, which overrides the playbook's connection for that run's secret variables. Job output SHALL include the referenced connection id, or null. Ad-hoc commands, scripts and pings SHALL NOT accept a connection.

#### Scenario: Job saved with a connection
- **WHEN** a user creates or updates a job with the id of an existing connection
- **THEN** the job SHALL store the reference and return it

#### Scenario: Job saved with an unknown connection
- **WHEN** a user creates or updates a job with a connection id that does not exist
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL be written

#### Scenario: Interactive run with an unknown connection
- **WHEN** a user starts `v1.run.run` with a connection id that does not exist
- **THEN** the call SHALL fail with `NOT_FOUND` and no run SHALL start

### Requirement: The client secret is masked in run output
The runner SHALL replace the connection's client secret, and every fetched value covered by the `playbook-secret-variables` capability, with a fixed mask in every string of a run's events before they are logged or sent to the backend. This masking is a best-effort defence for those literal values; it SHALL NOT be presented as protecting transformed values.

#### Scenario: Playbook prints a masked value
- **WHEN** a task's `msg`, `stdout` or `stderr` contains the client secret or a fetched value literally
- **THEN** the event sent to the backend and the runner's logs SHALL contain the mask instead of the value

#### Scenario: Run without secret variables
- **WHEN** a run has no secret variables
- **THEN** its events SHALL be forwarded unchanged

### Requirement: Operators are told the limits
The connection page and the project website guide SHALL state that fetched values are masked only literally, so tasks that transform or print secrets should still use `no_log`, and that anyone able to edit or run a playbook can read the secrets its connection allows, so identities need least-privilege access in Infisical. The guide SHALL explain declaring secret variables and SHALL state that the collection's lookups and modules need credentials passed explicitly.

#### Scenario: Connection page
- **WHEN** a user opens the Infisical connections page
- **THEN** the page SHALL show the `no_log` and least-privilege guidance

#### Scenario: Website guide
- **WHEN** a reader opens the Infisical guide in English or Spanish
- **THEN** it SHALL include a secret variables example and the limits above

## REMOVED Requirements

### Requirement: Credentials reach only the runs that reference them
**Reason**: Client credentials no longer enter the Ansible environment; the runner uses them itself to fetch the declared secrets.
**Migration**: Replace `lookup('infisical.vault.read_secrets', ...)` that relied on injected credentials with secret variables, or pass credentials to the lookup explicitly.
