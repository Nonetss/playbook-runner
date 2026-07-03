# Structured Logging

## Purpose

Provide a single shared, configured structured logger used by the backend and the `@playbook-runner/api` package, replacing ad-hoc `console.*` calls with leveled, machine-parseable output suitable for production log aggregation.

## Requirements

### Requirement: Shared structured logger

The backend and the `@playbook-runner/api` package SHALL emit operational logs through a single shared, configured logger instance rather than `console.*`. Log entries SHALL be structured (machine-parseable JSON in production) and carry a severity level.

#### Scenario: Application log is structured

- **WHEN** backend or API code emits an operational log
- **THEN** the entry is produced by the shared logger with a level and structured fields, not via `console.log`/`console.error`

#### Scenario: Contextual fields instead of string prefixes

- **WHEN** a log describes an event about a specific entity (e.g. a job run, a migration step)
- **THEN** the relevant identifiers are attached as structured fields rather than interpolated into an ad-hoc `[prefix]` message string

### Requirement: Log level from environment

The logger's minimum severity level SHALL be controlled by an environment variable, defaulting to `info` when unset.

#### Scenario: Default level

- **WHEN** no log-level environment variable is set
- **THEN** the logger emits `info` and above and suppresses `debug`

#### Scenario: Overriding the level

- **WHEN** the log-level variable is set to `debug`
- **THEN** `debug` entries are emitted

### Requirement: Environment-appropriate output format

The logger SHALL emit JSON in production and MAY emit human-readable pretty output in development, selected without code changes.

#### Scenario: Production format

- **WHEN** the service runs in production
- **THEN** log lines are emitted as single-line JSON suitable for a log aggregator

#### Scenario: Development format

- **WHEN** the service runs in development with pretty output enabled
- **THEN** log lines are human-readable while carrying the same level and fields

### Requirement: Errors logged with cause

Error-level logs SHALL include the underlying error (message and stack) as a structured field.

#### Scenario: Logging a caught error

- **WHEN** code catches an error and logs it (e.g. a failed scheduled run or bootstrap failure)
- **THEN** the log entry is at `error` level and carries the error's message and stack as structured fields
