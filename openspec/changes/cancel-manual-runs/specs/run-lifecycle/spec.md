## MODIFIED Requirements

### Requirement: Cancellation propagates to the Ansible execution
When the consumer of an execution stream stops consuming it before the terminal frame — client disconnect, early return, error, or deadline — the backend SHALL cancel the underlying `RunnerService` gRPC call without waiting for the run's next event, and the Ansible service SHALL signal the running `ansible-runner` execution to stop via its cancel callback. This applies to playbook, command, script, and ping streams and to job executions.

#### Scenario: Browser disconnects mid-run
- **WHEN** a user closes the tab while a `run.run`, `run.command`, or `run.script` stream is in progress
- **THEN** the backend SHALL cancel the gRPC call and the Ansible service SHALL stop the `ansible-runner` execution instead of letting it continue on the target hosts

#### Scenario: Caller leaves during a silent task
- **WHEN** the caller of a `run.run`, `run.command`, `run.script` or `run.ping` stream leaves while the current task produces no event, so the backend only receives `heartbeat` frames
- **THEN** the backend SHALL cancel the gRPC call at once rather than when the run next produces a task event

#### Scenario: Caller leaves before the run starts
- **WHEN** the caller leaves while the backend is still resolving the run
- **THEN** the backend SHALL NOT open the gRPC call

#### Scenario: Run exceeds its deadline
- **WHEN** an execution exceeds `RUN_TIMEOUT_MS`
- **THEN** the gRPC call SHALL be cancelled and the Ansible execution SHALL be stopped

#### Scenario: Stream completes normally
- **WHEN** the Ansible service sends the terminal `done` frame
- **THEN** no cancellation SHALL be signalled and the run SHALL report its real status

## ADDED Requirements

### Requirement: Manual job runs can be cancelled
The system SHALL expose `jobs.runs.cancel`, available to every authenticated, non-`pending` user, which takes a run id and cancels that job run's execution if a person started it (`trigger = 'manual'`) and it is in progress. A cancelled run SHALL stop its `RunnerService` gRPC call without waiting for the run's next event. Calling it again for a run already being cancelled SHALL succeed without changing who is recorded as having cancelled it. The call SHALL return once the cancellation has been requested, not once the run has settled.

#### Scenario: Cancelling a manual run in progress
- **WHEN** an authenticated user calls `jobs.runs.cancel` for a manual run that is `running`
- **THEN** the call SHALL succeed, the gRPC call SHALL be cancelled and the Ansible service SHALL stop the execution

#### Scenario: Cancelling during a silent task
- **WHEN** a manual run is cancelled while its current task produces no event
- **THEN** the gRPC call SHALL be cancelled at once rather than when the run next produces a task event

#### Scenario: Scheduled run
- **WHEN** a user calls `jobs.runs.cancel` for a run with `trigger = 'schedule'`
- **THEN** the call SHALL fail with `FORBIDDEN` and the run SHALL keep executing

#### Scenario: Run not in progress
- **WHEN** a user calls `jobs.runs.cancel` for a run that has already reached a terminal status, or that has no live execution in this backend
- **THEN** the call SHALL fail with `CONFLICT` and the run row SHALL NOT change

#### Scenario: Unknown run
- **WHEN** a user calls `jobs.runs.cancel` with a well-formed id that matches no run
- **THEN** the call SHALL fail with `NOT_FOUND`

#### Scenario: Malformed run id
- **WHEN** a user calls `jobs.runs.cancel` with an id that is not a UUID
- **THEN** the call SHALL fail with `BAD_REQUEST`

#### Scenario: Pending or anonymous caller
- **WHEN** a user with role `pending` or an anonymous caller calls `jobs.runs.cancel`
- **THEN** the call SHALL fail with `FORBIDDEN` or `UNAUTHORIZED` respectively, and the run SHALL keep executing

#### Scenario: Cancelled twice
- **WHEN** a second user calls `jobs.runs.cancel` for a run that is still stopping after a first cancellation
- **THEN** the call SHALL succeed and the run SHALL record the first user as having cancelled it

### Requirement: Cancelled job runs finalize as cancelled
A job run whose cancellation stopped its stream before a terminal frame SHALL be persisted with status `cancelled`, the events captured so far, its finish time, and an error text naming the user who cancelled it, and SHALL NOT be reported as a lost connection. `jobs.runs.watch` subscribers SHALL receive the terminal result with status `cancelled` and `ok = false`, after the row is stored. A run whose terminal `done` or `error` frame arrived before the cancellation took effect SHALL keep its real outcome. Once settled, a cancelled run SHALL no longer block a new run of the same job.

#### Scenario: Run is cancelled
- **WHEN** a manual run that has produced some events is cancelled before its terminal frame
- **THEN** its row SHALL have status `cancelled`, those events, a `finishedAt`, an error naming the user, and watchers SHALL receive those events followed by a `cancelled` terminal result

#### Scenario: Run is cancelled before Ansible reports a recap
- **WHEN** a run is cancelled before Ansible emits its recap
- **THEN** `hostsOk` and `hostsFailed` SHALL be null

#### Scenario: Run finishes as the cancellation arrives
- **WHEN** the terminal `done` frame is received before the cancellation stops the stream
- **THEN** the run SHALL be stored with the status that frame reports, not `cancelled`

#### Scenario: New run after a cancellation
- **WHEN** a user calls `jobs.run` for a job whose latest run has settled as `cancelled`
- **THEN** a new run SHALL start and SHALL NOT fail with `CONFLICT`

### Requirement: Closing an interactive playbook stream cancels the run
Closing a `run.run` stream SHALL be the way to cancel an interactive playbook run: no separate API call is involved, and the browser receives no confirmation that Ansible has stopped, since the stream it would arrive on is gone. A cancelled interactive run SHALL leave no record, as interactive runs are not stored.

#### Scenario: Cancelling an interactive run
- **WHEN** the client closes a `run.run` stream that is in progress
- **THEN** the backend SHALL cancel the gRPC call, and the Ansible service SHALL stop the execution and remove its run material
