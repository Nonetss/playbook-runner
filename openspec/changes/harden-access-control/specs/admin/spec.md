## ADDED Requirements

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
