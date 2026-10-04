## MODIFIED Requirements

### Requirement: Inventory names are restricted
Device and group names SHALL match `^[A-Za-z0-9._-]{1,64}$` and SHALL NOT be `.` or `..`. Create and update procedures SHALL reject other names with a validation error. The group name `all`, compared case-insensitively, is reserved for the built-in All group: creating a group with that name, or renaming a group to it, SHALL be rejected with a `BAD_REQUEST` error. A group that already has that name SHALL still be updatable as long as its name does not change.

#### Scenario: Traversal name is rejected
- **WHEN** a client creates a device named `../../x`
- **THEN** the system SHALL respond with a `BAD_REQUEST` validation error and SHALL NOT persist the device

#### Scenario: Valid name is accepted
- **WHEN** a client creates a device named `web-01.prod`
- **THEN** the device SHALL be created

#### Scenario: Reserved group name is rejected on create
- **WHEN** a client creates a group named `All`
- **THEN** the system SHALL respond with a `BAD_REQUEST` error and SHALL NOT persist the group

#### Scenario: Renaming a group to the reserved name is rejected
- **WHEN** a client updates the group `web` with the name `all`
- **THEN** the system SHALL respond with a `BAD_REQUEST` error and the group SHALL keep its previous name

#### Scenario: Pre-existing group with the reserved name stays editable
- **WHEN** a group that was created as `all` before the name was reserved is updated with the same name and a new description
- **THEN** the update SHALL succeed

#### Scenario: Device names are not reserved
- **WHEN** a client creates a device named `all`
- **THEN** the device SHALL be created
