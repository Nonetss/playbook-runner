## ADDED Requirements

### Requirement: Store bash scripts as CRUD resources
The system SHALL let an authenticated user create, list, read, update, and delete bash scripts, where each script has a `name`, an optional `description`, and a `content` (the shell script text). Scripts SHALL be persisted independently of playbooks.

#### Scenario: Create a script
- **WHEN** an authenticated user submits a name and script content
- **THEN** the system SHALL persist a new script and return it with a generated id

#### Scenario: List scripts
- **WHEN** an authenticated user requests the script list
- **THEN** the system SHALL return all stored scripts

#### Scenario: Update a script
- **WHEN** an authenticated user edits an existing script's name, description, or content
- **THEN** the system SHALL persist the changes and return the updated script

#### Scenario: Delete a script
- **WHEN** an authenticated user deletes a script by id
- **THEN** the system SHALL remove it and it SHALL no longer appear in the list

### Requirement: Dedicated Scripts section
The frontend SHALL provide a dedicated Scripts section, reachable from a top-level navbar link, that lists stored scripts and offers create, edit, and delete actions with a content editor for the script body — mirroring the Playbooks section.

#### Scenario: Section is reachable from the navbar
- **WHEN** an authenticated user opens the app
- **THEN** a navbar link SHALL navigate to the Scripts list at its own route

#### Scenario: Create and edit use a content editor
- **WHEN** a user opens the create or edit view
- **THEN** the view SHALL present name, description, and a monospace editor for the script content

#### Scenario: Empty name or content is rejected
- **WHEN** a user submits the form without a name or without content
- **THEN** the form SHALL block submission and indicate the required fields
