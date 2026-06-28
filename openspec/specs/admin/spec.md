# Admin

## Purpose
Provide administrative user-management capabilities (roles, bans, impersonation, and user CRUD) through the Better Auth Admin plugin, so privileged users can manage other accounts.

## Requirements

### Requirement: Admin plugin enabled
The system SHALL enable the Better Auth Admin plugin on both the server and the auth client, using the default `user` and `admin` roles.

#### Scenario: Admin client operations are available
- **WHEN** the auth client is initialized with the admin client plugin
- **THEN** admin operations (list users, set role, ban, impersonate) SHALL be callable from the client

### Requirement: Admin schema fields
The system SHALL extend the `user` table with `role` (default `user`), `banned`, `banReason`, and `banExpires` fields, and SHALL extend the `session` table with an `impersonatedBy` field.

#### Scenario: User carries a role
- **WHEN** a user record is created
- **THEN** it SHALL have a `role` field defaulting to `user`

#### Scenario: Impersonated session is attributable
- **WHEN** an admin impersonates a user
- **THEN** the resulting session SHALL record the admin id in `impersonatedBy`

### Requirement: Role-based administrative access
The system SHALL restrict administrative operations to users holding the `admin` role.

#### Scenario: Admin performs a privileged action
- **WHEN** a user with the `admin` role performs an administrative operation
- **THEN** the system SHALL allow it

#### Scenario: Non-admin attempts a privileged action
- **WHEN** a user without the `admin` role attempts an administrative operation
- **THEN** the system SHALL deny it

### Requirement: Account banning blocks access
The system SHALL prevent banned users from signing in and SHALL revoke their existing sessions.

#### Scenario: Banned user is denied
- **WHEN** a banned user attempts to sign in
- **THEN** the system SHALL reject the sign-in
