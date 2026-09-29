## ADDED Requirements

### Requirement: Playbook source
Every playbook SHALL have a source, `inline` (authored in the UI) or `git`
(produced by a repository sync). Existing and newly created playbooks SHALL
default to `inline`. Git-sourced playbooks SHALL expose their repository id,
file path and missing flag.

#### Scenario: Create keeps inline source
- **WHEN** a user creates a playbook through the playbook form or API
- **THEN** the playbook SHALL be persisted with source `inline`

### Requirement: Git-sourced playbooks are read-only
The system SHALL reject updating, moving or deleting a Git-sourced playbook
with `FORBIDDEN`; such playbooks SHALL remain viewable, runnable and
schedulable. The UI SHALL hide edit, move and delete actions for them and
mark them as read-only.

#### Scenario: Edit attempt on a Git playbook
- **WHEN** a user calls the playbook update endpoint for a Git-sourced playbook
- **THEN** the system SHALL respond `FORBIDDEN` and leave the playbook unchanged

#### Scenario: Browse a repository
- **WHEN** a user opens a repository in the playbook browser
- **THEN** the UI SHALL list its Git-sourced playbooks with their path, the synced commit and a read-only marker
