## ADDED Requirements

### Requirement: Global run feed

The system SHALL expose a paginated feed of job runs across all jobs, ordered most-recent-first, so an operator can review recent activity without opening each job individually.

Each entry SHALL include the run's job name, status (`pending`, `running`, `ok`, `failed`), trigger (`manual` or `schedule`), creation time, and — when available — its duration.

#### Scenario: Listing recent runs across jobs

- **WHEN** an authenticated user requests the global run feed
- **THEN** the system returns runs from every job, newest first, each carrying its job name, status, trigger, timestamp, and duration

#### Scenario: Paginating the feed

- **WHEN** the user requests the next page using the cursor returned by the previous response
- **THEN** the system returns the following batch of runs without repeating or skipping entries

#### Scenario: Run whose job was deleted

- **WHEN** a run's parent job no longer exists (job deleted, `job_id` null)
- **THEN** the run still appears in the feed with a placeholder job name rather than being omitted or causing an error

### Requirement: Run duration

The system SHALL derive a run's duration from its `startedAt` and `finishedAt` timestamps and expose it alongside each run.

#### Scenario: Finished run

- **WHEN** a run has both `startedAt` and `finishedAt`
- **THEN** its duration is reported as the elapsed time between them

#### Scenario: In-flight or never-started run

- **WHEN** a run has no `finishedAt` (still running) or no `startedAt`
- **THEN** its duration is reported as unavailable rather than as zero or a negative value

### Requirement: Aggregate run metrics

The system SHALL compute aggregate metrics over a caller-specified time window: total run count, success count, failed count, success rate, and average duration of finished runs.

#### Scenario: Metrics over a window

- **WHEN** an authenticated user requests metrics for a given window (e.g. last 24 hours or last 7 days)
- **THEN** the system returns the total, success, and failed counts, the success rate, and the average duration computed only from runs created within that window

#### Scenario: Empty window

- **WHEN** no runs exist in the requested window
- **THEN** the system returns zeroed counts and a well-defined success rate (not a division-by-zero error)

### Requirement: Per-job rollups

The system SHALL provide a per-job rollup summarizing each job's most recent run status and its recent success ratio, suitable for compact indicators such as sparklines.

#### Scenario: Rollup per job

- **WHEN** the user requests per-job rollups
- **THEN** each job is returned with its latest run status and the success ratio of its recent runs

### Requirement: History and metrics surfaced in the UI

The system SHALL present the global run feed on a dedicated history page reachable from navigation, and SHALL surface recent activity and run metrics on the dashboard.

#### Scenario: Viewing the history page

- **WHEN** the user navigates to the job run history page
- **THEN** the page shows the paginated global run feed with status, trigger, duration, and timestamp per run

#### Scenario: Dashboard activity and metrics

- **WHEN** the user views the dashboard
- **THEN** it shows a recent-activity panel of the latest runs and stat cards reflecting the aggregate run metrics

#### Scenario: Opening a run from the feed

- **WHEN** the user selects a run in the history feed or activity panel
- **THEN** the system navigates to that run's detail view showing its captured output
