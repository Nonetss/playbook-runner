## ADDED Requirements

### Requirement: Section landing overview
The application SHALL support a parent route overview for navigation sections
that declare sub-items. The overview SHALL present the section name,
description, and one direct path for each declared sub-item.

#### Scenario: Open inventory landing page
- **WHEN** a user navigates to `/inventory`
- **THEN** the page SHALL introduce the Inventory section
- **AND** provide direct paths to Devices and Groups
- **AND** SHALL NOT render either CRUD resource list on the landing page

### Requirement: Persistent section sidebar
The application SHALL provide a reusable sidebar layout for a declared
navigation section. The sidebar SHALL identify the current section, list its
sub-items, and indicate the active child route.

#### Scenario: Navigate an inventory child route
- **WHEN** a user opens `/inventory/devices` or `/inventory/groups`
- **THEN** the sidebar SHALL offer links to both inventory child routes
- **AND** the current route SHALL be identifiable as active

#### Scenario: Use inventory navigation on a narrow viewport
- **WHEN** the inventory route is displayed below the desktop breakpoint
- **THEN** the section links SHALL remain available through an explicit
sidebar trigger
