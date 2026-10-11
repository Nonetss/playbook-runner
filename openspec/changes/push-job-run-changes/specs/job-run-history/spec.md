## ADDED Requirements

### Requirement: Run changes are streamed to authenticated clients
The system SHALL expose `jobs.runs.watchChanges`, a streaming procedure available to every authenticated, non-`pending` user, which takes no input. The stream SHALL begin with a `subscribed` event, then emit one change event, carrying `runId`, `jobId`, `status` and `trigger`, each time any job run starts (`running`) or finishes (`ok` or `failed`), whether a schedule or a manual `jobs.run` started it. A finish event SHALL only be emitted once the run's terminal state is persisted. The stream SHALL stay open until the caller leaves, and SHALL release the subscription as soon as it does.

#### Scenario: Scheduled run starts and finishes
- **WHEN** the scheduler starts a run of a job and that run later finishes as `failed`
- **THEN** every open `jobs.runs.watchChanges` stream SHALL receive a change with that run's id, its job id, status `running` and trigger `schedule`, and later a change with status `failed`

#### Scenario: Manual run from another client
- **WHEN** one user triggers `jobs.run` while another user has `jobs.runs.watchChanges` open
- **THEN** the second user's stream SHALL receive the run's `running` change and, once it is persisted, its terminal change

#### Scenario: Pending user
- **WHEN** a user with role `pending` calls `jobs.runs.watchChanges`
- **THEN** the call SHALL fail with `FORBIDDEN`

#### Scenario: Subscription opens
- **WHEN** a client calls `jobs.runs.watchChanges`
- **THEN** the first event it receives SHALL be `subscribed`, before any run change

### Requirement: Run views follow run changes without polling
The frontend SHALL keep every view of job runs current from the run-change stream instead of periodic polling: the history feed and its metrics, the dashboard's recent activity and metrics, the jobs list's per-job rollups, a job's run list, and a selected run's detail. Each run change SHALL make these views refetch the affected data. The app SHALL hold a single subscription while an authenticated, non-`pending` user is signed in, across page navigations. After the subscription is (re)established it SHALL refresh all of these views once, so changes that happened while it was disconnected are not lost. It SHALL reconnect with backoff after a lost connection. These views SHALL NOT poll on a timer.

#### Scenario: History page while a scheduled run finishes
- **WHEN** the user is on `/jobs/history` and a scheduled run finishes
- **THEN** the feed SHALL show the run's terminal status and the metrics SHALL include it without a manual refresh or waiting for a polling interval

#### Scenario: Returning to a page with cached data
- **WHEN** the user leaves the history page, a run starts elsewhere, and the user navigates back to the history page within a minute
- **THEN** the feed SHALL show the new run

#### Scenario: Reconnecting after a lost connection
- **WHEN** the run-change stream drops, a run finishes while it is down, and the stream reconnects
- **THEN** the views SHALL refresh once on reconnecting and show that run's terminal status

#### Scenario: No polling while idle
- **WHEN** a run view is open and no run starts or finishes
- **THEN** the frontend SHALL NOT issue periodic requests for that view's run data

### Requirement: Job detail follows a newly started run
On a job's detail page, when a run of that job starts (from the schedule, another tab or this one) while the page shows the job's newest run or no run, the new run SHALL appear in the run list and become the selected run, and the console SHALL attach to its live output. When the user has selected an older run, the selection SHALL stay, and the new run SHALL only appear in the list.

#### Scenario: Scheduled run while watching the latest run
- **WHEN** the job detail page shows the job's latest (finished) run and the scheduler starts a new run of that job
- **THEN** the new run SHALL appear at the top of the list, become selected, and stream its live output in the console

#### Scenario: Reviewing an older run
- **WHEN** the user has selected an older run of the job and a new run of that job starts
- **THEN** the selection SHALL stay on the older run and the new run SHALL appear in the list as `running`

#### Scenario: Run of another job
- **WHEN** a run of a different job starts
- **THEN** the job detail page SHALL NOT change its selection or console
