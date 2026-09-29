# RPC API

## Purpose
Expose application functionality as type-safe oRPC procedures, with a clear separation between public and authenticated endpoints, served over HTTP at `/rpc`.

## Requirements

### Requirement: Typed request context
The system SHALL build a per-request context exposing the resolved `user`, `session`, and request `headers` to every procedure. The context MUST be derived from the values populated by the session resolution middleware.

#### Scenario: Procedure reads the authenticated user
- **WHEN** a procedure handler executes for an authenticated request
- **THEN** the context SHALL expose the current `user`

### Requirement: Public procedures
The system SHALL provide a public procedure builder that requires no authentication.

#### Scenario: Version-one health check is publicly accessible
- **WHEN** any client calls the `v1.health.check` procedure
- **THEN** the system SHALL return `"OK"` without requiring authentication

### Requirement: Protected procedures
The system SHALL provide a protected procedure builder that rejects requests lacking an authenticated user with an `UNAUTHORIZED` error, and rejects authenticated users whose role is `pending` with a `FORBIDDEN` error.

#### Scenario: Protected procedure without authentication
- **WHEN** a request without an authenticated user calls a protected procedure
- **THEN** the system SHALL throw an `UNAUTHORIZED` error and not execute the handler

#### Scenario: Protected procedure with authentication
- **WHEN** a request with an authenticated user whose role is not `pending` calls a protected procedure
- **THEN** the handler SHALL execute with the user available on the context

#### Scenario: Pending user is blocked
- **WHEN** an authenticated user with role `pending` calls a protected procedure
- **THEN** the system SHALL throw a `FORBIDDEN` error and not execute the handler

### Requirement: RPC handler mounting
The system SHALL serve all procedures through an RPC handler mounted under
`/rpc`, dispatching versioned procedures by name.

#### Scenario: Version-one procedure is reachable by name
- **WHEN** a request is sent to `/rpc/v1/<feature>/<procedure>`
- **THEN** the corresponding version-one procedure SHALL be invoked

### Requirement: Admin procedures
The system SHALL provide an admin procedure builder, derived from the protected procedure builder, that rejects authenticated users whose role is not `admin` with a `FORBIDDEN` error.

#### Scenario: Admin calls an admin procedure
- **WHEN** an authenticated user with role `admin` calls an admin procedure
- **THEN** the handler SHALL execute

#### Scenario: Operator calls an admin procedure
- **WHEN** an authenticated user with role `user` calls an admin procedure
- **THEN** the system SHALL throw a `FORBIDDEN` error and not execute the handler

### Requirement: CSRF protection for cookie-authenticated calls
The RPC handler (`/rpc`) and the OpenAPI handler (`/api`) SHALL reject state-changing requests that rely on the session cookie unless they carry the CSRF header (`x-csrf-token: orpc`). Requests authenticated with an `x-api-key` or `Authorization` header SHALL be exempt, since they carry no ambient credentials.

#### Scenario: Frontend RPC call succeeds
- **WHEN** the frontend oRPC client calls a procedure with the CSRF header and a session cookie
- **THEN** the procedure SHALL execute normally

#### Scenario: Form-encoded cross-site request is rejected
- **WHEN** a request to `/api/v1/jobs/run` carries a session cookie but no CSRF header and no API key
- **THEN** the system SHALL respond with `403` and SHALL NOT execute the procedure

#### Scenario: API key client is unaffected
- **WHEN** a script calls `/api/v1/...` with a valid `x-api-key` header and no CSRF header
- **THEN** the procedure SHALL execute normally

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
