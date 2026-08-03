## MODIFIED Requirements

### Requirement: RPC handler mounting
The system SHALL serve all procedures through an RPC handler mounted under
`/rpc`, dispatching versioned procedures by name.

#### Scenario: Version-one procedure is reachable by name
- **WHEN** a request is sent to `/rpc/v1/<feature>/<procedure>`
- **THEN** the corresponding version-one procedure SHALL be invoked

### Requirement: Public procedures
The system SHALL provide a public procedure builder that requires no
authentication.

#### Scenario: Version-one health check is publicly accessible
- **WHEN** any client calls the `v1.healthCheck` procedure
- **THEN** the system SHALL return `"OK"` without requiring authentication

### Requirement: Private data endpoint
The system SHALL provide a protected `v1.privateData` procedure that returns
the authenticated user together with a message.

#### Scenario: Authenticated user reads version-one private data
- **WHEN** an authenticated user calls `v1.privateData`
- **THEN** the system SHALL return the user and a private message
