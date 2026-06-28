# Authentication

## Purpose
Provide email/password authentication and session management for the application using Better Auth, backed by PostgreSQL through the Drizzle adapter, and expose a single HTTP handler plus a client SDK for the frontend.

## Requirements

### Requirement: Email and password authentication
The system SHALL allow users to authenticate using an email address and password. Email/password sign-in MUST be enabled in the Better Auth configuration.

#### Scenario: User signs in with valid credentials
- **WHEN** a user submits a valid email and password to the sign-in endpoint
- **THEN** the system creates a session and returns the authenticated user

#### Scenario: User signs in with invalid credentials
- **WHEN** a user submits credentials that do not match any account
- **THEN** the system rejects the request and does not create a session

### Requirement: Persistent session and user storage
The system SHALL persist users, sessions, accounts, and verification records in PostgreSQL using the Drizzle adapter configured with the `pg` provider and the shared auth schema.

#### Scenario: Session is stored on sign-in
- **WHEN** a session is created during sign-in
- **THEN** a row SHALL be written to the `session` table referencing the owning `user`

### Requirement: Better Auth HTTP handler
The system SHALL expose all Better Auth endpoints through a single handler mounted at `/api/auth/*` that accepts GET and POST requests.

#### Scenario: Auth request is routed to the handler
- **WHEN** a request is made to a path under `/api/auth/`
- **THEN** the request SHALL be delegated to the Better Auth handler and its response returned unchanged

### Requirement: Trusted origins and secure cookies
The system SHALL only accept authenticated requests from the configured CORS origin and SHALL issue session cookies with `sameSite=none`, `secure=true`, and `httpOnly=true`.

#### Scenario: Cross-site cookie is issued securely
- **WHEN** the server sets a session cookie
- **THEN** the cookie SHALL be marked `httpOnly`, `secure`, and `sameSite=none`

#### Scenario: Request from an untrusted origin
- **WHEN** a request originates from an origin that is not the configured CORS origin
- **THEN** the auth API SHALL reject it

### Requirement: Session resolution middleware
The system SHALL resolve the current session on every request and expose the authenticated `user` and `session` (or `null`) to downstream handlers. Resolution MUST accept a session cookie, a Bearer token, or an `x-api-key` header.

#### Scenario: Authenticated request populates context
- **WHEN** a request carries a valid session credential
- **THEN** the middleware SHALL set `user` and `session` on the request context

#### Scenario: Anonymous request populates null context
- **WHEN** a request carries no valid session credential
- **THEN** the middleware SHALL set `user` and `session` to `null`

### Requirement: Authentication client SDK
The system SHALL provide a client authentication instance configured with the public server URL so the frontend can call auth, API key, and admin operations.

#### Scenario: Client targets the configured server
- **WHEN** the auth client issues a request
- **THEN** it SHALL send the request to the configured `PUBLIC_SERVER_URL`
