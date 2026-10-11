## Purpose

Define how the shared group/device picker used by playbook runs, job forms, script runs and ad-hoc commands presents and records an inventory selection, so operators can see which devices a selection actually reaches.

## ADDED Requirements

### Requirement: Selected groups mark their member devices
In the shared inventory picker, every device that belongs to at least one selected group SHALL be shown as checked in the Devices section and SHALL be marked as included by a group, naming the covering group (when several selected groups cover it, the first one plus how many others). Selecting the built-in All group SHALL mark every device. Membership SHALL reflect the current group assignments; while membership is still loading, no device SHALL be shown as covered. The marking SHALL be visually distinguishable from a device the operator selected directly.

#### Scenario: Selecting a group marks its devices
- **WHEN** group `web` contains devices `a` and `b`, device `c` is in no group, and the operator selects `web`
- **THEN** devices `a` and `b` SHALL appear checked and marked as included by `web`, and device `c` SHALL remain unchecked

#### Scenario: Selecting All marks every device
- **WHEN** the operator selects the All group
- **THEN** every device in the picker SHALL appear checked and marked as included by All

#### Scenario: A device covered by two groups
- **WHEN** device `a` belongs to groups `web` and `db` and the operator selects both
- **THEN** device `a` SHALL appear checked once, marked as included by `web` and one more group

#### Scenario: Deselecting the group clears the marks
- **WHEN** the operator selects `web` and then deselects it, without having selected `a` or `b` directly
- **THEN** devices `a` and `b` SHALL appear unchecked

### Requirement: Group coverage is implicit in the selection
Devices marked because a group is selected SHALL NOT be added to the device selection. The selection sent to a run, command or script, the run page's URL (`groups` / `devices` query parameters) and a job's stored inventory SHALL contain only the entries the operator selected directly. A job that targets a group SHALL therefore keep following that group's membership at each execution.

#### Scenario: Run request contains only the group
- **WHEN** the operator selects group `web` (devices `a` and `b`) on the playbook run page and starts the run
- **THEN** the run request's inventory SHALL be `[{ "id": "<web>", "type": "group" }]` and the URL SHALL contain `groups=<web>` without a `devices` parameter

#### Scenario: Job stores only the group
- **WHEN** the operator selects group `web` in the job form and saves the job
- **THEN** the job's inventory SHALL be `[{ "id": "<web>", "type": "group" }]`

#### Scenario: Job editing shows the coverage
- **WHEN** the operator opens the edit form of a job whose inventory is `[{ "id": "<web>", "type": "group" }]`
- **THEN** `web` SHALL appear selected and its member devices SHALL appear checked and marked as included by `web`

### Requirement: Covered devices are locked while their group is selected
A device covered by a selected group SHALL NOT be toggleable on its own while that coverage lasts, and the picker SHALL expose it as checked and unavailable to assistive technology. A device the operator had selected directly SHALL keep that direct selection while covered, and SHALL return to its direct state when no selected group covers it any more.

#### Scenario: Clicking a covered device does nothing
- **WHEN** group `web` is selected and the operator clicks device `a`, a member of `web`
- **THEN** device `a` SHALL stay checked and the selection SHALL not change

#### Scenario: A direct selection survives the group
- **WHEN** the operator selects device `a` directly, then selects group `web` (which contains `a`), then deselects `web`
- **THEN** device `a` SHALL appear checked as a direct selection, and the selection SHALL contain the `a` device entry throughout

### Requirement: Device counter includes covered devices
The Devices section's `selected/total` counter SHALL count a device as selected when it is selected directly or covered by a selected group, counting each device once, so a collapsed section shows how many devices the selection reaches. When a search filters the list, the counter SHALL count only the visible devices, as it does today.

#### Scenario: Counter reflects group coverage
- **WHEN** the inventory has 5 devices, group `web` covers 2 of them and the operator selects `web` and one other device directly
- **THEN** the Devices section counter SHALL read `3/5`

### Requirement: Coverage applies to every picker surface
The coverage behaviour SHALL apply identically wherever the shared picker is used: the playbook run page, the job create and edit forms, the script run page and the commands page.

#### Scenario: Script run page shows coverage
- **WHEN** the operator selects group `web` on a script's run page
- **THEN** the members of `web` SHALL appear checked and marked as included by `web`
