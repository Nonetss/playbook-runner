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

#### Scenario: Health check is publicly accessible
- **WHEN** any client calls the `healthCheck` procedure
- **THEN** the system SHALL return `"OK"` without requiring authentication

### Requirement: Protected procedures
The system SHALL provide a protected procedure builder that rejects requests lacking an authenticated user with an `UNAUTHORIZED` error.

#### Scenario: Protected procedure without authentication
- **WHEN** a request without an authenticated user calls a protected procedure
- **THEN** the system SHALL throw an `UNAUTHORIZED` error and not execute the handler

#### Scenario: Protected procedure with authentication
- **WHEN** a request with an authenticated user calls a protected procedure
- **THEN** the handler SHALL execute with the user available on the context

### Requirement: Private data endpoint
The system SHALL provide a protected `privateData` procedure that returns the authenticated user together with a message.

#### Scenario: Authenticated user reads private data
- **WHEN** an authenticated user calls `privateData`
- **THEN** the system SHALL return the user and a private message

### Requirement: RPC handler mounting
The system SHALL serve all procedures through an RPC handler mounted under `/rpc`, dispatching each procedure by its name.

#### Scenario: Procedure is reachable by name
- **WHEN** a request is sent to `/rpc/<procedureName>`
- **THEN** the corresponding procedure SHALL be invoked
