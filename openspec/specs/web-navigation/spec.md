# Web Navigation

## Purpose
Provide the web application's top navigation shell, adapting to authentication state and viewport size, so users can move through the app, reach their account actions, and access admin tooling when authorized.

## Requirements

### Requirement: Authenticated and guest navbars
The web layout SHALL render an authenticated navbar by default and a guest navbar for public pages (such as login and registration). The guest navbar SHALL omit application navigation links, the user menu, and the settings action.

#### Scenario: Public page renders the guest navbar
- **WHEN** a page is rendered with the guest navbar flag enabled
- **THEN** the layout SHALL show only the brand and the theme toggle, without app links or account actions

#### Scenario: Application page renders the authenticated navbar
- **WHEN** a page is rendered without the guest navbar flag
- **THEN** the layout SHALL show the brand, navigation links, the user menu, and the settings action

### Requirement: Responsive navigation
The authenticated navbar SHALL show navigation links inline on large viewports and collapse them into a slide-out menu on smaller viewports.

#### Scenario: Large viewport shows inline links
- **WHEN** the navbar is displayed on a large (`lg` and up) viewport
- **THEN** the navigation links SHALL be shown inline

#### Scenario: Small viewport shows the slide-out menu
- **WHEN** the navbar is displayed below the large breakpoint
- **THEN** the navigation links SHALL be available through a slide-out menu opened from a menu button

### Requirement: Active link highlighting
The navigation SHALL highlight the link matching the current path. The home link MUST match only the exact root path, while other links match when the current path starts with the link's href.

#### Scenario: Home is active only at root
- **WHEN** the current path is `/`
- **THEN** only the home link SHALL be highlighted

#### Scenario: Section link is active on nested paths
- **WHEN** the current path starts with a section link's href (for example `/dashboard/...`)
- **THEN** that section link SHALL be highlighted

### Requirement: Account menu
The user menu SHALL reflect the current session. When no user is authenticated it SHALL present a sign-in action; when a user is authenticated it SHALL present the user's name and email, a link to the profile, and a sign-out action.

#### Scenario: Anonymous user sees sign-in
- **WHEN** no authenticated user is present
- **THEN** the user menu SHALL render a sign-in action linking to the login page

#### Scenario: Authenticated user sees account actions
- **WHEN** a user is authenticated
- **THEN** the user menu SHALL display the user's name and email and offer profile and sign-out actions

#### Scenario: Signing out
- **WHEN** the user selects the sign-out action
- **THEN** the system SHALL end the session and redirect to the login page

### Requirement: Admin entry point
The account menu SHALL offer access to the admin panel only to users holding the `admin` role, and SHALL toggle between entering and leaving the panel based on whether the current path is within the admin area.

#### Scenario: Admin sees the admin panel entry
- **WHEN** an authenticated user with the `admin` role opens the account menu outside the admin area
- **THEN** the menu SHALL offer an action to enter the admin panel

#### Scenario: Non-admin does not see the admin entry
- **WHEN** an authenticated user without the `admin` role opens the account menu
- **THEN** the menu SHALL NOT offer any admin panel action
