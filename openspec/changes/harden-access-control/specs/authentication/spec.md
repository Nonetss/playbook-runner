## MODIFIED Requirements

### Requirement: Email and password authentication
The system SHALL allow existing users to authenticate using an email address and password. Email/password sign-in MUST be enabled in the Better Auth configuration. Public email/password sign-up MUST be disabled (`disableSignUp`); new email/password accounts SHALL only be created by an administrator through the admin API or the seed script.

#### Scenario: User signs in with valid credentials
- **WHEN** a user submits a valid email and password to the sign-in endpoint
- **THEN** the system creates a session and returns the authenticated user

#### Scenario: User signs in with invalid credentials
- **WHEN** a user submits credentials that do not match any account
- **THEN** the system rejects the request and does not create a session

#### Scenario: Public sign-up is rejected
- **WHEN** an unauthenticated client calls the email/password sign-up endpoint
- **THEN** the system SHALL reject the request and SHALL NOT create a user

#### Scenario: Sign-up page is not reachable
- **WHEN** a visitor navigates to `/signup`
- **THEN** the frontend SHALL redirect to `/login` and the login page SHALL NOT link to a sign-up page

### Requirement: Trusted origins and secure cookies
The system SHALL only accept authenticated requests from the configured CORS origin and SHALL issue session cookies with `sameSite=lax`, `secure=true`, and `httpOnly=true`.

#### Scenario: Session cookie is issued securely
- **WHEN** the server sets a session cookie
- **THEN** the cookie SHALL be marked `httpOnly`, `secure`, and `sameSite=lax`

#### Scenario: Cross-site form post carries no session
- **WHEN** a page on a different site submits a POST request to the application
- **THEN** the browser SHALL NOT attach the session cookie and the request SHALL be treated as anonymous

#### Scenario: Request from an untrusted origin
- **WHEN** a request originates from an origin that is not the configured CORS origin
- **THEN** the auth API SHALL reject it

## ADDED Requirements

### Requirement: SSO account provisioning
When the generic OIDC provider is configured, the system SHALL allow users authenticated by that provider to sign in, creating a local account with the default `user` role on first sign-in. The identity provider is the gatekeeper for SSO access; disabling email/password sign-up SHALL NOT disable SSO provisioning.

#### Scenario: First SSO sign-in provisions an operator
- **WHEN** a user completes the OIDC flow for the first time
- **THEN** the system SHALL create a local user with role `user` and create a session

#### Scenario: SSO not configured
- **WHEN** the generic OAuth environment variables are not set
- **THEN** no SSO provider SHALL be registered and only email/password sign-in SHALL be available
