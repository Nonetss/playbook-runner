# Run Lifecycle

## Purpose

Cross-cutting guarantees for every execution (playbook, command, script, ping, job): cancellation propagates to Ansible, run material is cleaned up safely, events always serialize, concurrency is bounded, and job runs always finalize without overlapping.
## Requirements
### Requirement: Cancellation propagates to the Ansible execution
When the consumer of an execution stream stops consuming it before the terminal frame — client disconnect, early return, error, or deadline — the backend SHALL cancel the underlying `RunnerService` gRPC call, and the Ansible service SHALL signal the running `ansible-runner` execution to stop via its cancel callback. This applies to playbook, command, script, and ping streams and to job executions.

#### Scenario: Browser disconnects mid-run
- **WHEN** a user closes the tab while a `run.run`, `run.command`, or `run.script` stream is in progress
- **THEN** the backend SHALL cancel the gRPC call and the Ansible service SHALL stop the `ansible-runner` execution instead of letting it continue on the target hosts

#### Scenario: Run exceeds its deadline
- **WHEN** an execution exceeds `RUN_TIMEOUT_MS`
- **THEN** the gRPC call SHALL be cancelled and the Ansible execution SHALL be stopped

#### Scenario: Stream completes normally
- **WHEN** the Ansible service sends the terminal `done` frame
- **THEN** no cancellation SHALL be signalled and the run SHALL report its real status

### Requirement: Run material is removed only after execution has stopped
The Ansible service SHALL delete a run's scratch directory (playbook, script, and private key files) only after the `ansible-runner` worker has exited, on success, failure, and cancellation alike. File materialization and cleanup SHALL NOT block the service's event loop.

#### Scenario: Cancelled run still in progress
- **WHEN** a run is cancelled while `ansible-runner` is still executing
- **THEN** the service SHALL wait for the worker to exit before deleting the key files

#### Scenario: Secrets are removed after every outcome
- **WHEN** a run finishes, fails, or is cancelled
- **THEN** the run's scratch directory including all private key files SHALL no longer exist

### Requirement: Event fields are always serializable
The Ansible service SHALL deliver `msg`, `stdout`, and `stderr` event fields as strings; any non-string value (list, dict, number, boolean) SHALL be JSON-encoded rather than causing the stream to fail.

#### Scenario: Task returns a list message
- **WHEN** a task such as `debug: msg: [a, b]` or a failing `assert` produces a non-string `msg`
- **THEN** the corresponding event SHALL carry the JSON-encoded value and the stream SHALL continue until the terminal frame

### Requirement: Per-host SSH user is honored
The SSH user for each host SHALL be the username of the credential associated with that device, as written to the host's inventory variables. The runner SHALL NOT set `ansible_user` as an extra var. The configured default user SHALL apply only to hosts that arrive without a username.

#### Scenario: Devices with different users
- **WHEN** a run targets device A whose credential username is `deploy` and device B whose credential username is `admin`
- **THEN** Ansible SHALL connect to A as `deploy` and to B as `admin`

### Requirement: Concurrent executions are bounded
The Ansible service SHALL execute runs on a dedicated worker pool whose size is configured by `MAX_CONCURRENT_RUNS` (default 8). When every slot is in use, a new run request SHALL be rejected immediately with gRPC status `RESOURCE_EXHAUSTED`, which the backend SHALL surface to the caller as `TOO_MANY_REQUESTS`.

#### Scenario: Capacity available
- **WHEN** fewer than `MAX_CONCURRENT_RUNS` runs are executing
- **THEN** a new run SHALL start immediately

#### Scenario: Capacity exhausted
- **WHEN** `MAX_CONCURRENT_RUNS` runs are already executing and another run is requested
- **THEN** the request SHALL fail fast with `RESOURCE_EXHAUSTED` / `TOO_MANY_REQUESTS` and SHALL NOT be queued silently

### Requirement: Terminal frame reports an honest return code
The terminal `done` frame SHALL carry the `ansible-runner` return code, or `-1` when no return code is available; `ok` SHALL be true only when the return code is `0`.

#### Scenario: Runner produced no return code
- **WHEN** `ansible-runner` finishes without a return code
- **THEN** the `done` frame SHALL carry `rc = -1` and `ok = false`

### Requirement: Job runs always finalize
Every job run started by the backend SHALL reach a terminal state: the live-run registry SHALL publish a terminal result to watchers and release the entry even if persisting the outcome fails, and the backend SHALL make a best-effort attempt to mark the persisted run `failed` in that case.

#### Scenario: Persisting the outcome fails
- **WHEN** the database update that records a finished job run throws
- **THEN** `jobs.runs.watch` subscribers SHALL still receive a terminal `failed` result and the error SHALL be logged

### Requirement: A job does not run concurrently with itself
The backend SHALL NOT start a run for a job that already has a run in progress, regardless of trigger. A manual `jobs.run` request SHALL fail with `CONFLICT`; a scheduled tick SHALL skip the execution and log it.

#### Scenario: Manual run while a scheduled run is in progress
- **WHEN** a user calls `jobs.run` for a job whose scheduled run is still `running`
- **THEN** the request SHALL fail with `CONFLICT` and no new run row SHALL be created

#### Scenario: Scheduled tick while a manual run is in progress
- **WHEN** the scheduler fires for a job whose manual run is still `running`
- **THEN** the scheduler SHALL skip that tick without creating a run row

### Requirement: Execution inputs are bounded and validated
Execution and job inputs SHALL be validated before any run is created: `forks` SHALL be an integer between 1 and 50 for playbook runs, commands, scripts, and jobs, and a job's `cronExpression`, when present and non-empty, SHALL be a valid cron pattern.

#### Scenario: Forks above the cap
- **WHEN** a client submits a run, command, script, or job with `forks: 51`
- **THEN** the request SHALL be rejected with `BAD_REQUEST`

#### Scenario: Invalid cron expression
- **WHEN** a client creates or updates a job with `cronExpression: "not a cron"`
- **THEN** the request SHALL be rejected with `BAD_REQUEST` and the job SHALL NOT be saved

### Requirement: Graceful Ansible service shutdown
On shutdown the Ansible service SHALL give in-flight gRPC runs a grace period long enough to signal cancellation to `ansible-runner` and remove run material before the process exits.

#### Scenario: Service stops during a run
- **WHEN** the Ansible service receives a stop signal while a run is executing
- **THEN** the run SHALL be cancelled and its scratch directory removed before the process exits

### Requirement: Execution streams survive silent tasks
A `RunnerService` execution stream (playbook, command, script, ping, and job runs) SHALL stay open for as long as the execution runs within `RUN_TIMEOUT_MS`, even when Ansible produces no event for several minutes. The backend's gRPC channel SHALL send HTTP/2 keepalive pings, and the Ansible gRPC server SHALL accept them while a call is open. The Ansible service SHALL send a `heartbeat` frame whenever a run has produced no other frame for `RUN_HEARTBEAT_INTERVAL_S` (default 15 seconds, configurable).

#### Scenario: Task silent longer than the heartbeat interval
- **WHEN** a running task produces no Ansible event for longer than `RUN_HEARTBEAT_INTERVAL_S`
- **THEN** the Ansible service SHALL send a `heartbeat` frame for each elapsed interval and the stream SHALL remain open until the run's terminal `done` or `error` frame

#### Scenario: Task silent for several minutes
- **WHEN** a playbook task takes ten minutes without emitting any event, and the whole run finishes within `RUN_TIMEOUT_MS`
- **THEN** the run SHALL end with its real status and SHALL NOT fail with a gRPC `INTERNAL` / `RST_STREAM` error

#### Scenario: Events flowing continuously
- **WHEN** Ansible emits events more often than `RUN_HEARTBEAT_INTERVAL_S`
- **THEN** the Ansible service SHALL NOT send `heartbeat` frames

#### Scenario: Keepalive pings during a call
- **WHEN** the backend sends keepalive pings on a channel with an open run stream
- **THEN** the Ansible gRPC server SHALL NOT close the connection with `GOAWAY` `too_many_pings`

### Requirement: Heartbeat frames are transport-only
`heartbeat` frames SHALL NOT be visible outside the backend ↔ Ansible link. The backend SHALL NOT forward them to the browser stream, publish them to the live-run registry, or persist them in a job run's events. Heartbeats SHALL NOT count as a terminal frame.

#### Scenario: Interactive run receives heartbeats
- **WHEN** a `run.run`, `run.command`, `run.script` or `run.ping` stream receives `heartbeat` frames
- **THEN** the browser SHALL receive only the task events and the terminal result

#### Scenario: Job run receives heartbeats
- **WHEN** a job execution receives `heartbeat` frames
- **THEN** the stored `job_runs` events and the `jobs.runs.watch` subscribers SHALL NOT contain any heartbeat entry

### Requirement: Lost execution streams are reported as connection loss
When the gRPC stream of an execution ends with a transport error (`INTERNAL`, `UNAVAILABLE`, or a reset) before a terminal frame, the run's error message SHALL state that the connection to the Ansible service was lost, that the execution may have continued or finished on the hosts, and SHALL include the gRPC status for diagnosis.

#### Scenario: Stream reset during a job run
- **WHEN** a job run's gRPC stream fails with `INTERNAL: Received RST_STREAM`
- **THEN** the run SHALL be marked `failed` with an error that says the connection to the Ansible service was lost and includes `INTERNAL`

