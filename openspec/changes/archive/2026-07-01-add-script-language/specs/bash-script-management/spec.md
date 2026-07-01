## MODIFIED Requirements

### Requirement: Store bash scripts as CRUD resources

The system SHALL let an authenticated user create, list, read, update, and delete scripts, where each script has a `name`, an optional `description`, a `content` (the script text), and a `language` that is either `bash` or `python`. When a create or update request omits `language`, the system SHALL default it to `bash`. Scripts SHALL be persisted independently of playbooks.

#### Scenario: Create a script with a language

- **WHEN** an authenticated user submits a name, script content, and a `language` of `bash` or `python`
- **THEN** the system SHALL persist a new script with that language and return it with a generated id

#### Scenario: Create defaults to bash

- **WHEN** an authenticated user submits a name and content without a `language`
- **THEN** the system SHALL persist the script with `language` set to `bash`

#### Scenario: List scripts

- **WHEN** an authenticated user requests the script list
- **THEN** the system SHALL return all stored scripts, each including its `language`

#### Scenario: Update a script

- **WHEN** an authenticated user edits an existing script's name, description, content, or language
- **THEN** the system SHALL persist the changes and return the updated script

#### Scenario: Delete a script

- **WHEN** an authenticated user deletes a script by id
- **THEN** the system SHALL remove it and it SHALL no longer appear in the list

### Requirement: Dedicated Scripts section

The frontend SHALL provide a dedicated Scripts section, reachable from a top-level navbar link, that lists stored scripts and offers create, edit, and delete actions with a content editor for the script body and a language selector for `bash` or `python` — mirroring the Playbooks section and the command page's module selector.

#### Scenario: Section is reachable from the navbar

- **WHEN** an authenticated user opens the app
- **THEN** a navbar link SHALL navigate to the Scripts list at its own route

#### Scenario: Create and edit expose language and content

- **WHEN** a user opens the create or edit view
- **THEN** the view SHALL present name, description, a language selector defaulting to `bash`, and a monospace editor for the script content

#### Scenario: Editing preselects the stored language

- **WHEN** a user opens the edit view for an existing script
- **THEN** the language selector SHALL be preset to the script's stored `language`

#### Scenario: Empty name or content is rejected

- **WHEN** a user submits the form without a name or without content
- **THEN** the form SHALL block submission and indicate the required fields
