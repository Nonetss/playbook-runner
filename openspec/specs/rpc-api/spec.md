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

### Requirement: Resolve run procedure
The system SHALL provide a protected procedure that resolves a playbook run request into an executable bundle. Given `{ playbookId, inventory: [{ id, type: "group" | "device" }] }`, it SHALL return the playbook's `name` and `content` together with a de-duplicated list of target hosts, each carrying its address, username, SSH port (when set), and the credential's private key. Group selections SHALL be expanded to their member devices via the device-group relations, and the result merged with directly-selected devices and de-duplicated by device id.

#### Scenario: Authenticated resolve returns the bundle
- **WHEN** an authenticated client calls the resolve procedure with a valid `playbookId` and inventory selection
- **THEN** the system SHALL return the playbook content and the resolved, de-duplicated host list with each host's credential

#### Scenario: Group selection is expanded
- **WHEN** the inventory selection contains an entry with `type: "group"`
- **THEN** the returned hosts SHALL include all devices belonging to that group

#### Scenario: Unknown playbook
- **WHEN** the `playbookId` does not match an existing playbook
- **THEN** the system SHALL return a not-found error and SHALL NOT return a bundle

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without an authenticated user calls the resolve procedure
- **THEN** the system SHALL throw an `UNAUTHORIZED` error and SHALL NOT execute the handler
