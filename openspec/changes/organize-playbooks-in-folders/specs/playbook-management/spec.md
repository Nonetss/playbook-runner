## ADDED Requirements

### Requirement: Store playbooks as managed resources
The system SHALL let an authenticated user create, list, read, update, and
delete playbooks with a name, optional description, YAML content, and an
optional folder identifier.

#### Scenario: Create a playbook at the root
- **WHEN** an authenticated user creates a playbook without a folder
- **THEN** the system SHALL persist it with a null folder identifier

#### Scenario: Create a playbook in a folder
- **WHEN** an authenticated user creates a playbook with an existing folder id
- **THEN** the system SHALL persist it in that folder

#### Scenario: Reject an unknown folder
- **WHEN** a user creates, updates, or moves a playbook to an unknown folder id
- **THEN** the system SHALL reject the request without changing the playbook

### Requirement: Manage flat playbook folders
The system SHALL let authenticated users create, list, rename, and delete
playbook folders. Folders SHALL exist at one level and SHALL NOT have parent
folders.

#### Scenario: Create a folder
- **WHEN** an authenticated user submits a non-empty folder name
- **THEN** the system SHALL persist and return a folder with a generated id

#### Scenario: Rename a folder
- **WHEN** an authenticated user updates an existing folder name
- **THEN** the system SHALL persist and return the renamed folder

#### Scenario: Delete a folder with playbooks
- **WHEN** an authenticated user deletes a folder containing playbooks
- **THEN** the system SHALL delete the folder and move those playbooks to the root

### Requirement: Browse playbooks by folder
The frontend SHALL show folders before playbooks in the Playbooks section and
SHALL let the user browse either the root or one selected folder.

#### Scenario: Browse the root
- **WHEN** the user opens the Playbooks section without a selected folder
- **THEN** the view SHALL show all folders and only playbooks whose folder id is null

#### Scenario: Browse a folder
- **WHEN** the user opens a folder
- **THEN** the URL SHALL identify that folder and the view SHALL show only its playbooks

#### Scenario: Return to the root
- **WHEN** the user activates the back-to-root control from a folder
- **THEN** the view SHALL return to the root folder and playbook listing

### Requirement: Move playbooks between locations
The frontend SHALL let users move a playbook to any existing folder or to the
root without changing its content or execution identity.

#### Scenario: Move a playbook to a folder
- **WHEN** the user selects a destination folder from a playbook action
- **THEN** the playbook SHALL appear in that folder and retain its id and content

#### Scenario: Move a playbook to the root
- **WHEN** the user selects the root as a playbook destination
- **THEN** the playbook SHALL have a null folder id and appear in the root

#### Scenario: Drop a playbook onto a folder
- **WHEN** the user drags a playbook card and drops it onto a folder card
- **THEN** the playbook SHALL move into that folder and the folder SHALL show drop feedback

### Requirement: Search and filter playbook resources
The frontend SHALL let users search the visible playbook resources and filter
the listing by folders or playbooks.

#### Scenario: Search visible resources
- **WHEN** the user enters text in the search field
- **THEN** the view SHALL show only visible folders or playbooks matching that text

#### Scenario: Filter by resource type
- **WHEN** the user selects folders or playbooks in the type filter
- **THEN** the view SHALL hide resources of the other type

#### Scenario: No filtered results
- **WHEN** no visible resource matches the search and type filter
- **THEN** the view SHALL show a no-results state

### Requirement: Select a folder while editing playbooks
The playbook create and edit form SHALL expose a folder selector containing the
root and all existing folders.

#### Scenario: Create from an open folder
- **WHEN** the user starts creating a playbook while browsing a folder
- **THEN** that folder SHALL be preselected in the create form

#### Scenario: Edit preserves the current folder
- **WHEN** the user opens an existing playbook for editing
- **THEN** its stored folder SHALL be selected until the user changes it
