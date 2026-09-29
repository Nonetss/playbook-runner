## ADDED Requirements

### Requirement: Shared terminal frame
The command, script run, playbook run and job detail screens SHALL render
execution output inside one shared terminal frame component providing the
title bar, prompt line, stream status banner, result banner and optional side
panel. Screens SHALL NOT reimplement these parts.

#### Scenario: Consistent frame across run screens
- **WHEN** a user opens `/commands`, `/scripts/<id>/run`,
  `/playbooks/<id>/run` or `/jobs/<id>`
- **THEN** each SHALL render the same terminal frame structure and spacing

### Requirement: Terminal token set
The run console SHALL be styled exclusively through `--terminal-*` tokens
(surface, raised surface, border, foreground, muted, and the status tones
`ok`, `changed`, `failed`, `skipped`, `running`) and SHALL NOT use raw
palette classes or general theme tokens whose meaning depends on the page
theme.

#### Scenario: Failure count on light theme
- **WHEN** a playbook run reports failed tasks while the light theme is active
- **THEN** the failure count and stderr output SHALL be legible against the
  terminal surface

#### Scenario: Status tones are consistent
- **WHEN** a host result is `ok`, `changed`, `failed`, `skipped` or running
- **THEN** the playbook console and the host console SHALL use the same tone
  for the same status

### Requirement: Terminal controls
Buttons and banners rendered inside the terminal frame SHALL use a terminal
variant whose surface and text colours come from the terminal token set.

#### Scenario: Jump to latest on light theme
- **WHEN** the "jump to latest" or reconnect control is shown on the light
  theme
- **THEN** it SHALL render with terminal surface colours rather than a light
  page-surface button

### Requirement: Localized console labels
The run console SHALL render every label, including play headers, recap
titles and failure counts, through the translation function with plural
handling.

#### Scenario: English locale failure count
- **WHEN** the active locale is English and one task failed
- **THEN** the console SHALL render the English singular failure label
