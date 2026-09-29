## MODIFIED Requirements

### Requirement: Jobs section pages
The frontend SHALL expose Scheduler at `/jobs/scheduler` and execution History
at `/jobs/history` as separate pages within the Ansible navigation section,
next to Playbooks. The former `/jobs` overview route SHALL redirect to the
Ansible section overview at `/ansible`, which presents direct paths to
Playbooks, Scheduler and History.

#### Scenario: Open Jobs overview
- **WHEN** a user navigates to `/jobs`
- **THEN** the application SHALL redirect to `/ansible`
- **AND** the Ansible overview SHALL present Scheduler and History entry points

#### Scenario: Open Scheduler
- **WHEN** a user navigates to `/jobs/scheduler`
- **THEN** the page SHALL render existing job scheduling and management
  behaviour

#### Scenario: Open History
- **WHEN** a user navigates to `/jobs/history`
- **THEN** the page SHALL render existing cross-job run history behaviour

### Requirement: Jobs section navigation
Jobs pages SHALL use the shared sidebar layout of the Ansible section, which
lists Playbooks, Scheduler and History and identifies the active child route.
Job detail and form routes under `/jobs/*` SHALL keep the Ansible section
active.

#### Scenario: Navigate Jobs sub-pages
- **WHEN** a user opens a Jobs page
- **THEN** the sidebar SHALL offer Playbooks, Scheduler and History links
- **AND** identify the active child route
