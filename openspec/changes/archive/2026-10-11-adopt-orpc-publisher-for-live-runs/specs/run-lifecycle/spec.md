## ADDED Requirements

### Requirement: Live job run watchers receive every event exactly once
While a job run is live (executing, or finished within the short retention window), every `jobs.runs.watch` subscriber SHALL receive all of that run's events in order, each exactly once, followed by the run's terminal result. This SHALL hold whether the subscriber attaches before the first event, mid-run or after the run finished, and regardless of how many events the run produces or how slowly the subscriber reads them: the backend SHALL NOT drop events to bound a subscriber's backlog. A run that is not live SHALL end the watch immediately with a `null` result.

#### Scenario: Watcher attaches mid-run
- **WHEN** a client calls `jobs.runs.watch` after the run has already produced some events
- **THEN** it SHALL receive the earlier events, then the events produced afterwards, with none missing or repeated, and finally the terminal result

#### Scenario: Slow watcher on a verbose run
- **WHEN** a run produces many more events (for example, several hundred) than the watcher has consumed so far
- **THEN** the watcher SHALL still receive every event in order once it catches up

#### Scenario: Event published while the watcher attaches
- **WHEN** the run publishes an event at the same moment a watcher subscribes
- **THEN** the watcher SHALL receive that event exactly once

#### Scenario: Watcher attaches after the run finished
- **WHEN** a client calls `jobs.runs.watch` within the retention window after the run finished
- **THEN** it SHALL receive every event of the run followed by the terminal result

#### Scenario: Run is not live
- **WHEN** a client calls `jobs.runs.watch` for a run that never was live in this backend or whose retention window has passed
- **THEN** the stream SHALL end at once with a `null` result

### Requirement: Leaving a job run watch does not affect the run
When a `jobs.runs.watch` subscriber goes away (the client closes the stream or the request is aborted), the backend SHALL release that subscription without waiting for the run's next event, and SHALL NOT cancel the job run or interrupt other subscribers of the same run.

#### Scenario: One of two watchers disconnects
- **WHEN** two clients watch the same live run and one of them closes its stream
- **THEN** the run SHALL keep executing and the remaining watcher SHALL keep receiving its events and terminal result

#### Scenario: Watcher disconnects during a silent task
- **WHEN** a watcher closes its stream while the run is producing no events
- **THEN** its subscription SHALL be released immediately rather than when the run next produces an event

### Requirement: Job run console reattaches after a lost connection
When the frontend's live job run watch fails because the connection was lost (network error, proxy reset, stream interrupted) rather than because the API returned an error, the job run console SHALL reattach to the same run automatically, with bounded retries and backoff. On reattaching, the console SHALL show the run's events as replayed by the new watch, without duplicating events it had already shown. If the run is no longer live, the console SHALL fall back to the persisted run as it does today. API errors (for example `UNAUTHORIZED`) and exhausting the retries SHALL end in the existing error state.

#### Scenario: Network drop during a live run
- **WHEN** the watch stream for a running job run is interrupted by a network error and the run is still executing
- **THEN** the console SHALL reattach, show every event of the run once, and keep following it until the terminal result

#### Scenario: Run finished while disconnected
- **WHEN** the connection is lost and, by the time the console reattaches, the run has finished and left the retention window
- **THEN** the console SHALL show the persisted run's outcome instead of an error

#### Scenario: API error
- **WHEN** the watch fails with an API error such as `UNAUTHORIZED`
- **THEN** the console SHALL NOT retry and SHALL show the error state

#### Scenario: Retries exhausted
- **WHEN** every reattach attempt fails with a connection error
- **THEN** the console SHALL stop retrying and show the error state
