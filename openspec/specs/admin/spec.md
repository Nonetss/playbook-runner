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

### Requirement: Seeded administrator
The seed script SHALL create the initial account through the admin API with role `admin`, SHALL NOT print the password, and SHALL refuse to create the account with the default seed password when `NODE_ENV` is `production`. Because the seed runs on every backend start, refusing SHALL NOT stop the backend.

#### Scenario: Fresh database is seeded
- **WHEN** the seed script runs against a database without the seed user
- **THEN** a user with the configured email and role `admin` SHALL be created and the log output SHALL NOT contain the password

#### Scenario: Default password in production
- **WHEN** the seed script runs with `NODE_ENV=production` and `SEED_ADMIN_PASSWORD` unset or equal to the documented default
- **THEN** the seed SHALL log an error and SHALL NOT create a user, and the backend SHALL keep starting

### Requirement: User management page
The frontend SHALL provide an admin-only user management page that lists users and lets an administrator create a user (email, name, password, role), change a user's role between `user`, `admin` and `pending`, and ban or unban a user, using the Better Auth admin client.

#### Scenario: Admin creates an operator
- **WHEN** an administrator submits the create-user form with a valid email, name and password
- **THEN** the user SHALL be created and appear in the list with the selected role

#### Scenario: Non-admin cannot reach the page
- **WHEN** a user whose role is not `admin` navigates to the user management page
- **THEN** the frontend SHALL redirect away from it and the navigation SHALL NOT show a link to it
