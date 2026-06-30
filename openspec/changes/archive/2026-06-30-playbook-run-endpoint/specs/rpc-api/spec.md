## ADDED Requirements

### Requirement: Resolve run procedure
The system SHALL provide a protected procedure that resolves a playbook run request into an executable bundle. Given `{ playbookId, inventory: [{ id, type: "group" | "device" }] }`, it SHALL return the playbook's `name` and `content` together with a de-duplicated list of target hosts, each carrying its address, username, SSH port (when set), and the credential's private key. Group selections SHALL be expanded to their member devices via the device-group relations, and the result merged with directly-selected devices and de-duplicated by device id.

#### Scenario: Authenticated resolve returns the bundle
- **WHEN** an authenticated client calls the resolve procedure with a valid `playbookId` and inventory selection
- **THEN** the system SHALL return the playbook content and the resolved, de-duplicated host list with each host's credential

#### Scenario: Group selection is expanded
- **WHEN** the inventory selection contains an entry with `type: "group"`
- **THEN** the returned hosts SHALL include all devices belonging to that group

#### Scenario: Unknown playbook
- **WHEN** the `playbookId` does not match an existing playbook
- **THEN** the system SHALL return a not-found error and SHALL NOT return a bundle

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without an authenticated user calls the resolve procedure
- **THEN** the system SHALL throw an `UNAUTHORIZED` error and SHALL NOT execute the handler
