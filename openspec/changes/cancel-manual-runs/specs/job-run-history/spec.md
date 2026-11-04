## MODIFIED Requirements

### Requirement: Global run feed

The system SHALL expose a paginated feed of job runs across all jobs, ordered most-recent-first, so an operator can review recent activity without opening each job individually.

Each entry SHALL include the run's job name, status (`pending`, `running`, `ok`, `failed`, `cancelled`), trigger (`manual` or `schedule`), creation time, and — when available — its duration.

#### Scenario: Listing recent runs across jobs

- **WHEN** an authenticated user requests the global run feed
- **THEN** the system returns runs from every job, newest first, each carrying its job name, status, trigger, timestamp, and duration

#### Scenario: Paginating the feed

- **WHEN** the user requests the next page using the cursor returned by the previous response
- **THEN** the system returns the following batch of runs without repeating or skipping entries

#### Scenario: Run whose job was deleted

- **WHEN** a run's parent job no longer exists (job deleted, `job_id` null)
- **THEN** the run still appears in the feed with a placeholder job name rather than being omitted or causing an error

#### Scenario: Cancelled run in the feed

- **WHEN** the feed includes a run that was cancelled
- **THEN** its entry carries status `cancelled` and its duration up to the moment it settled

### Requirement: Aggregate run metrics

The system SHALL compute aggregate metrics over a caller-specified time window: total run count, success count, failed count, success rate, and average duration of finished runs. A cancelled run SHALL count in the total, SHALL NOT count as failed, and SHALL NOT lower the success rate, which is computed over the runs that were not cancelled.

#### Scenario: Metrics over a window

- **WHEN** an authenticated user requests metrics for a given window (e.g. last 24 hours or last 7 days)
- **THEN** the system returns the total, success, and failed counts, the success rate, and the average duration computed only from runs created within that window

#### Scenario: Empty window

- **WHEN** no runs exist in the requested window
- **THEN** the system returns zeroed counts and a well-defined success rate (not a division-by-zero error)

#### Scenario: Window with cancelled runs

- **WHEN** a window holds three `ok` runs, one `failed` run and one `cancelled` run
- **THEN** the system returns a total of 5, a failed count of 1 and a success rate of 0.75

#### Scenario: Window with only cancelled runs

- **WHEN** every run in the window is `cancelled`
- **THEN** the system returns a success rate of 0 rather than a division-by-zero error

### Requirement: Per-job rollups

The system SHALL provide a per-job rollup summarizing each job's most recent run status and its recent success ratio, suitable for compact indicators such as sparklines. Cancelled runs SHALL NOT lower the recent success ratio.

#### Scenario: Rollup per job

- **WHEN** the user requests per-job rollups
- **THEN** each job is returned with its latest run status and the success ratio of its recent runs

#### Scenario: Latest run was cancelled

- **WHEN** a job's most recent run is `cancelled` and its other recent runs are `ok`
- **THEN** its rollup reports `cancelled` as the latest status and a recent success ratio of 1

### Requirement: Run changes are streamed to authenticated clients
The system SHALL expose `jobs.runs.watchChanges`, a streaming procedure available to every authenticated, non-`pending` user, which takes no input. The stream SHALL begin with a `subscribed` event, then emit one change event, carrying `runId`, `jobId`, `status` and `trigger`, each time any job run starts (`running`) or finishes (`ok`, `failed` or `cancelled`), whether a schedule or a manual `jobs.run` started it. A finish event SHALL only be emitted once the run's terminal state is persisted. The stream SHALL stay open until the caller leaves, and SHALL release the subscription as soon as it does.

#### Scenario: Scheduled run starts and finishes
- **WHEN** the scheduler starts a run of a job and that run later finishes as `failed`
- **THEN** every open `jobs.runs.watchChanges` stream SHALL receive a change with that run's id, its job id, status `running` and trigger `schedule`, and later a change with status `failed`

#### Scenario: Manual run from another client
- **WHEN** one user triggers `jobs.run` while another user has `jobs.runs.watchChanges` open
- **THEN** the second user's stream SHALL receive the run's `running` change and, once it is persisted, its terminal change

#### Scenario: Manual run cancelled by another client
- **WHEN** one user cancels a manual run while another user has `jobs.runs.watchChanges` open
- **THEN** the second user's stream SHALL receive a change with status `cancelled` once it is persisted

#### Scenario: Pending user
- **WHEN** a user with role `pending` calls `jobs.runs.watchChanges`
- **THEN** the call SHALL fail with `FORBIDDEN`

#### Scenario: Subscription opens
- **WHEN** a client calls `jobs.runs.watchChanges`
- **THEN** the first event it receives SHALL be `subscribed`, before any run change

## ADDED Requirements

### Requirement: Cancelled runs read as cancelled, not failed
Every view showing a job run's status (history feed, dashboard activity, job list, job detail) SHALL show a cancelled run with its own localized label and a neutral status tone, never with the destructive treatment of a failed run. Cancelled runs SHALL NOT be presented as partial, whatever their host counts.

#### Scenario: Cancelled run in the history page
- **WHEN** the user views a cancelled run in the history feed
- **THEN** it SHALL show the "Cancelada" label (in Spanish) with a neutral tone

#### Scenario: Cancelled run with hosts that finished
- **WHEN** a cancelled run has both successful and failed hosts in its recap
- **THEN** it SHALL show as cancelled, not as partial
