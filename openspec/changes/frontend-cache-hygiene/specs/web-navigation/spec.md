## MODIFIED Requirements

### Requirement: Account menu
The user menu SHALL reflect the current session. When no user is authenticated it SHALL present a sign-in action; when a user is authenticated it SHALL present the user's name and email, a link to the profile, and a sign-out action. Signing out SHALL clear all client-side cached data before leaving the page.

#### Scenario: Anonymous user sees sign-in
- **WHEN** no authenticated user is present
- **THEN** the user menu SHALL render a sign-in action linking to the login page

#### Scenario: Authenticated user sees account actions
- **WHEN** a user is authenticated
- **THEN** the user menu SHALL display the user's name and email and offer profile and sign-out actions

#### Scenario: Signing out
- **WHEN** the user selects the sign-out action
- **THEN** the system SHALL end the session, clear the client data cache, and redirect to the login page

## ADDED Requirements

### Requirement: Frontend route guard
The frontend SSR middleware SHALL require an authenticated session for every route except an explicit list of public paths. A request path SHALL be treated as public only when it equals a listed public path or starts with a listed public path followed by `/`. Authenticated users requesting `/login` SHALL be redirected to `/`.

#### Scenario: Exact public path
- **WHEN** an anonymous visitor requests `/login`
- **THEN** the page is served without a session lookup redirect

#### Scenario: Look-alike path is not public
- **WHEN** an anonymous visitor requests a path such as `/login-foo` or `/scalarx`
- **THEN** the middleware SHALL redirect to `/login`

#### Scenario: Public sub-path
- **WHEN** an anonymous visitor requests a sub-path of a public path (e.g. `/scalar/assets/app.js`)
- **THEN** the request is served without authentication

#### Scenario: Authenticated user visits login
- **WHEN** a user with a valid session requests `/login`
- **THEN** the middleware SHALL redirect to `/`
