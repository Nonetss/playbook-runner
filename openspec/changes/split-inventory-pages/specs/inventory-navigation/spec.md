## ADDED Requirements

### Requirement: Dedicated inventory resource routes
The frontend SHALL expose Devices at `/inventory/devices` and Groups at
`/inventory/groups` as independent inventory CRUD surfaces. Each surface SHALL
show only its relevant list, primary create action, loading/error/empty state,
and associated dialogs.

#### Scenario: Open devices inventory
- **WHEN** a user navigates to `/inventory/devices`
- **THEN** the page SHALL show device management without a groups tab panel
- **AND** the primary action SHALL create a device

#### Scenario: Open groups inventory
- **WHEN** a user navigates to `/inventory/groups`
- **THEN** the page SHALL show group management without a devices tab panel
- **AND** the primary action SHALL create a group

### Requirement: Compatible inventory entry point
The existing `/inventory` route SHALL remain available and SHALL present the
Devices inventory surface.

#### Scenario: Existing inventory link remains valid
- **WHEN** a user follows an existing `/inventory` link
- **THEN** the Devices inventory surface SHALL render successfully

### Requirement: Inventory sub-navigation
The application navigation SHALL expose Devices and Groups as nested links of
the Inventory section, with the active route identifiable in desktop and
mobile navigation.

#### Scenario: Navigate between inventory surfaces
- **WHEN** a user opens Inventory navigation
- **THEN** Devices and Groups links SHALL be available
- **AND** the active inventory surface SHALL be identifiable
