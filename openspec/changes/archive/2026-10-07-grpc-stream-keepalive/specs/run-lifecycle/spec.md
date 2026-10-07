## ADDED Requirements

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
