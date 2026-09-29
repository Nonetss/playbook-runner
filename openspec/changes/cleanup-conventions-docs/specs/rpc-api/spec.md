## ADDED Requirements

### Requirement: Resource identifier validation
Procedures that address a stored resource by identifier (credentials, scripts, playbooks, playbook folders, jobs, job runs, inventory devices and groups) SHALL validate each identifier input as a UUID before any database access, and SHALL reject malformed identifiers with a `BAD_REQUEST` error.

#### Scenario: Malformed identifier is rejected
- **WHEN** an authenticated client calls `v1.scripts.get` with `id: "not-a-uuid"`
- **THEN** the system SHALL respond with `BAD_REQUEST` and SHALL NOT query the database

#### Scenario: Well-formed identifier is accepted
- **WHEN** an authenticated client calls `v1.scripts.get` with the UUID of an existing script
- **THEN** the system SHALL return that script

### Requirement: Missing resources return NOT_FOUND
Procedures that read, update, or delete a single stored resource by identifier SHALL throw a `NOT_FOUND` error when no row matches the identifier, instead of returning `null` or surfacing a database error.

#### Scenario: Get of a missing resource
- **WHEN** an authenticated client calls `v1.credentials.get` with a UUID that matches no credential
- **THEN** the system SHALL respond with `NOT_FOUND`

#### Scenario: Update of a missing resource
- **WHEN** an authenticated client calls `v1.jobs.update` with a UUID that matches no job
- **THEN** the system SHALL respond with `NOT_FOUND` and SHALL NOT create a row

#### Scenario: Delete of a missing resource
- **WHEN** an authenticated client calls `v1.inventory.devices.delete` with a UUID that matches no device
- **THEN** the system SHALL respond with `NOT_FOUND`

### Requirement: Update timestamps
Procedures that update a stored resource SHALL set the resource's `updatedAt` to the time of the update and SHALL NOT allow the resource identifier to be changed by the update payload.

#### Scenario: Updating a script refreshes updatedAt
- **WHEN** an authenticated client updates an existing script
- **THEN** the returned script SHALL have an `updatedAt` later than its previous value and the same `id`

## REMOVED Requirements

### Requirement: Private data endpoint
**Reason**: Scaffold/demo endpoint with no frontend or external consumer; it returned the full user row as an untyped payload.
**Migration**: Use Better Auth's `/api/auth/get-session` (or the frontend `authClient.getSession()`) to read the current user.

### Requirement: Resolve run procedure
**Reason**: No such procedure is exposed; run resolution is an internal helper used by the `v1.run.*` streaming procedures and the job executor, and resolving hosts would otherwise expose credential private keys over the API.
**Migration**: None required — call `v1.run.run`, `v1.run.script`, `v1.run.command`, or `v1.jobs.run`, which resolve the bundle server-side.
