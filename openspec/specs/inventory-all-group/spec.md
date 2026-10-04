# Inventory All Group

## Purpose

Provide a built-in, always-present All group whose members are every device in the inventory, so runs, commands, scripts and scheduled jobs can target the whole fleet without maintaining a group by hand.

## Requirements

### Requirement: Inventory selections accept the All group
Every procedure that takes an inventory selection (playbook runs, ad-hoc commands, script runs, and job create/update) SHALL accept an entry `{ type: "all" }` alongside the existing `{ id, type: "group" }` and `{ id, type: "device" }` entries. The `all` entry SHALL NOT carry an id. Entries of type `group` or `device` without a valid id SHALL still be rejected with a `BAD_REQUEST` validation error. Job reads SHALL return stored `all` entries unchanged.

#### Scenario: All entry is accepted by a run
- **WHEN** an authenticated client starts a playbook run with inventory `[{ "type": "all" }]`
- **THEN** the request SHALL pass validation and the run SHALL start

#### Scenario: Group entry still requires an id
- **WHEN** a client sends inventory `[{ "type": "group" }]`
- **THEN** the system SHALL respond with a `BAD_REQUEST` validation error

#### Scenario: Job round-trips the All entry
- **WHEN** a client creates a job with inventory `[{ "type": "all" }]` and then reads it
- **THEN** the returned job SHALL list the inventory as `[{ "type": "all" }]`

### Requirement: The All group resolves to every device
When a selection contains an `all` entry, the resolved host list SHALL include every device in the inventory at resolution time. The result SHALL be de-duplicated with any other `group` or `device` entries in the same selection. The existing failure rules SHALL apply unchanged: if the inventory has no devices, the selection SHALL be rejected as producing no devices to run against, and if any resolved device has no credential, the run SHALL NOT start and the error SHALL name the devices without a credential.

#### Scenario: All expands to every device
- **WHEN** the inventory has devices `a`, `b` and `c` and a run targets `[{ "type": "all" }]`
- **THEN** the run SHALL target exactly `a`, `b` and `c`

#### Scenario: All overlaps with other entries
- **WHEN** a run targets `[{ "type": "all" }, { "id": "<a>", "type": "device" }]`
- **THEN** device `a` SHALL appear exactly once in the resolved hosts

#### Scenario: Empty inventory
- **WHEN** the inventory has no devices and a run targets `[{ "type": "all" }]`
- **THEN** the run SHALL fail with the "no devices to run against" validation error and SHALL NOT start

#### Scenario: A device without a credential blocks the run
- **WHEN** a run targets `[{ "type": "all" }]` and device `b` has no credential
- **THEN** the run SHALL NOT start and the error SHALL name `b`

### Requirement: Jobs targeting All follow the inventory
A job whose stored inventory contains an `all` entry SHALL resolve its hosts at each execution, so devices added after the job was saved SHALL be included and deleted devices SHALL be excluded, without editing the job.

#### Scenario: Device added after the job was saved
- **WHEN** a job targets `[{ "type": "all" }]` and a new device is added before its next scheduled execution
- **THEN** that execution SHALL include the new device

### Requirement: The All group is listed first and is read-only
The groups surface at `/inventory/groups` SHALL always show an All group as the first entry, even when no user-created groups exist. It SHALL show the total device count and a preview of member names, and SHALL expose only an open action: no edit, device assignment or delete actions. The All group SHALL NOT be stored as a database row, and the group CRUD procedures SHALL NOT return it. The groups surface's count SHALL include the All group.

#### Scenario: All is pinned first
- **WHEN** a user opens `/inventory/groups` with groups `web` and `db`
- **THEN** the list SHALL show All first, followed by `web` and `db`

#### Scenario: All appears with no user groups
- **WHEN** a user opens `/inventory/groups` and no groups have been created
- **THEN** the list SHALL show the All group instead of an empty state

#### Scenario: All cannot be modified
- **WHEN** a user opens the actions of the All group card
- **THEN** only the open action SHALL be available

### Requirement: All group detail page
`/inventory/all/group` SHALL render a read-only detail page for the All group that lists every device in the inventory with its address. It SHALL NOT show the edit form, device assignment toggles or the danger zone, and SHALL explain that the group always contains every device.

#### Scenario: Open the All group
- **WHEN** a user navigates to `/inventory/all/group`
- **THEN** the page SHALL list every device and SHALL NOT offer to edit, assign devices or delete

### Requirement: All group in the inventory picker and search
The shared inventory picker used by playbook runs, commands, scripts and the job form SHALL list All as the first group whenever the inventory has at least one device, and selecting it SHALL send a `{ type: "all" }` entry. A run page's selection SHALL round-trip through the URL as `groups=all`, and editing a job that targets All SHALL show All as selected. The ⌘K search SHALL include All among group results and open its detail page.

#### Scenario: Pick All for a playbook run
- **WHEN** a user selects All in the run picker and starts the run
- **THEN** the request SHALL contain the inventory entry `{ "type": "all" }`

#### Scenario: Selection survives a reload
- **WHEN** a user selects All on the run page and reloads it
- **THEN** All SHALL still be selected

#### Scenario: Edit a job that targets All
- **WHEN** a user opens the edit form of a job whose inventory is `[{ "type": "all" }]`
- **THEN** All SHALL appear selected in the picker

#### Scenario: Search finds All
- **WHEN** a user types `all` in the ⌘K search
- **THEN** the All group SHALL appear among the group results and choosing it SHALL open `/inventory/all/group`
