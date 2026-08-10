# Job Section Navigation

## Purpose
Expose the Jobs section as a parent overview plus dedicated Scheduler and History pages, with shared sidebar navigation and a legacy `/history` redirect for backward compatibility.

## Requirements

### Requirement: Jobs section pages
The frontend SHALL expose Scheduler at `/jobs/scheduler` and execution History
at `/jobs/history` as separate pages within the Jobs section. The parent
`/jobs` route SHALL present direct paths to both pages rather than rendering a
scheduler list itself.

#### Scenario: Open Jobs overview
- **WHEN** a user navigates to `/jobs`
- **THEN** the page SHALL present Scheduler and History entry points
- **AND** SHALL NOT render the scheduler list or history feed directly

#### Scenario: Open Scheduler
- **WHEN** a user navigates to `/jobs/scheduler`
- **THEN** the page SHALL render existing job scheduling and management
  behaviour

#### Scenario: Open History
- **WHEN** a user navigates to `/jobs/history`
- **THEN** the page SHALL render existing cross-job run history behaviour

### Requirement: Jobs section navigation
Jobs section pages SHALL use the shared sidebar layout and identify Scheduler
and History as Jobs sub-items.

#### Scenario: Navigate Jobs sub-pages
- **WHEN** a user opens a Jobs section page
- **THEN** the sidebar SHALL offer Scheduler and History links
- **AND** identify the active child route

### Requirement: Legacy History route compatibility
The former `/history` path SHALL redirect to `/jobs/history`.

#### Scenario: Follow a legacy History link
- **WHEN** a user navigates to `/history`
- **THEN** the application SHALL redirect to `/jobs/history`
