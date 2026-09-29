## MODIFIED Requirements

### Requirement: Section landing overview
The application SHALL support a parent route overview for navigation sections
that declare sub-items. The overview SHALL present the section name,
description, and one direct path for each declared sub-item. Navigation
SHALL be organised in three sections: Inventory (Devices, Groups,
Credentials), Ansible (Playbooks, Scheduler, History; overview at
`/ansible`) and Bash (Scripts, Commands; overview at `/bash`), without
changing the existing routes of those pages. The former `/automation` and
`/jobs` overviews SHALL redirect to `/ansible`.

#### Scenario: Open inventory landing page
- **WHEN** a user navigates to `/inventory`
- **THEN** the page SHALL introduce the Inventory section
- **AND** provide direct paths to Devices and Groups
- **AND** SHALL NOT render either CRUD resource list on the landing page

#### Scenario: Open Ansible landing page
- **WHEN** a user navigates to `/ansible`
- **THEN** the page SHALL introduce the Ansible section
- **AND** provide direct paths to Playbooks, Scheduler and History

#### Scenario: Open Bash landing page
- **WHEN** a user navigates to `/bash`
- **THEN** the page SHALL introduce the Bash section
- **AND** provide direct paths to Scripts and Commands

#### Scenario: Job routes belong to the Ansible section
- **WHEN** a user opens `/jobs/new`, `/jobs/<id>` or `/jobs/<id>/edit`
- **THEN** the Ansible section SHALL be the active navigation section and its
  sidebar SHALL be shown

### Requirement: Persistent section sidebar
The application SHALL provide a reusable sidebar layout for every declared
navigation section (Inventory, Ansible, Bash). The sidebar SHALL identify the current section, list its
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
  `/scripts` to `/scripts/<id>/run`
- **THEN** the section sidebar SHALL remain visible with the parent sub-item
  marked active

#### Scenario: Single padding level
- **WHEN** any page inside the section sidebar layout is rendered
- **THEN** the distance between the sidebar edge and the page content SHALL
  equal the page padding of pages without a sidebar
