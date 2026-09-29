## MODIFIED Requirements

### Requirement: Section landing overview
The application SHALL support a parent route overview for navigation sections
that declare sub-items. The overview SHALL present the section name,
description, and one direct path for each declared sub-item. Playbooks,
Scripts and Commands SHALL be grouped under an Automation section whose
overview is served at `/automation`, without changing their existing routes.

#### Scenario: Open inventory landing page
- **WHEN** a user navigates to `/inventory`
- **THEN** the page SHALL introduce the Inventory section
- **AND** provide direct paths to Devices and Groups
- **AND** SHALL NOT render either CRUD resource list on the landing page

#### Scenario: Open automation landing page
- **WHEN** a user navigates to `/automation`
- **THEN** the page SHALL introduce the Automation section
- **AND** provide direct paths to Playbooks, Scripts and Commands

### Requirement: Persistent section sidebar
The application SHALL provide a reusable sidebar layout for every declared
navigation section. The sidebar SHALL identify the current section, list its
sub-items, and indicate the active child route. The sidebar SHALL also be
rendered on the section's detail, form and run routes, and SHALL persist
across client-side navigation within the application without re-mounting.
The shell SHALL NOT render an additional header bar whose only content is the
sidebar trigger, and page content SHALL receive padding from exactly one
layout level.

#### Scenario: Navigate an inventory child route
- **WHEN** a user opens `/inventory/devices` or `/inventory/groups`
- **THEN** the sidebar SHALL offer links to both inventory child routes
- **AND** the current route SHALL be identifiable as active

#### Scenario: Use inventory navigation on a narrow viewport
- **WHEN** the inventory route is displayed below the desktop breakpoint
- **THEN** the section links SHALL remain available through an explicit
  sidebar trigger

#### Scenario: Sidebar stays on detail and run routes
- **WHEN** a user navigates from `/jobs/scheduler` to `/jobs/<id>`, or from
  `/playbooks` to `/playbooks/<id>/run`
- **THEN** the section sidebar SHALL remain visible with the parent sub-item
  marked active

#### Scenario: Single padding level
- **WHEN** any page inside the section sidebar layout is rendered
- **THEN** the distance between the sidebar edge and the page content SHALL
  equal the page padding of pages without a sidebar
