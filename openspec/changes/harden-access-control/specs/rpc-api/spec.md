## MODIFIED Requirements

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

## ADDED Requirements

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
