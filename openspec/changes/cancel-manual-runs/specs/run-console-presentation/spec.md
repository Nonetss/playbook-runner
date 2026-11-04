## ADDED Requirements

### Requirement: Playbook run console offers cancellation
While a playbook run started from the playbook run page is in progress, the console SHALL offer a "Cancel run" action in place of "Stop watching". The action SHALL ask for confirmation, and the confirmation SHALL state that Ansible stops, that changes already applied are not rolled back, and that a command already launched on a host may keep running there. After confirming, the console SHALL say that the cancellation was sent, and SHALL NOT claim the run may still be active as if nothing had been attempted. Commands, scripts and ping keep their current controls.

#### Scenario: User confirms cancellation
- **WHEN** the user activates "Cancel run" on a running playbook and confirms
- **THEN** the stream SHALL be closed and the console SHALL show that the run was cancelled, with the output received so far still visible

#### Scenario: User dismisses the confirmation
- **WHEN** the user activates "Cancel run" and dismisses the confirmation
- **THEN** the run and its live output SHALL continue uninterrupted

#### Scenario: Run finishes during the confirmation
- **WHEN** the run reaches its terminal result while the confirmation is open and the user then confirms
- **THEN** the console SHALL keep showing the run's real result and not a cancellation

### Requirement: Job run console offers cancellation for manual runs
On a job's detail page, while the selected run is `running` and has `trigger = 'manual'`, the console SHALL offer a "Cancel run" action with a confirmation carrying the same warnings as the playbook run console. Selected runs started by the schedule SHALL NOT offer it. After confirming, the action SHALL show a "Cancelling…" state and be disabled until the run settles. "Stop watching" SHALL remain available, since leaving a job's console does not stop the job. A selected run that settled as `cancelled` SHALL show its text (who cancelled it) with a neutral tone, not as a failure.

#### Scenario: Manual run in progress
- **WHEN** the selected run is a running manual run
- **THEN** the console SHALL offer both "Cancel run" and "Stop watching"

#### Scenario: Scheduled run in progress
- **WHEN** the selected run is a running scheduled run
- **THEN** the console SHALL offer "Stop watching" but not "Cancel run"

#### Scenario: Cancellation settles
- **WHEN** the user confirms and the run settles as `cancelled`
- **THEN** the console SHALL show the cancelled result, the run list SHALL show its cancelled status, and "Run now" SHALL be available again

#### Scenario: Cancellation refused because the run already finished
- **WHEN** the user confirms and the API answers `CONFLICT`
- **THEN** the console SHALL leave the "Cancelling…" state, tell the user the run had already finished, and show the run's real result

#### Scenario: Run page reloaded during a cancellation
- **WHEN** the user reloads the job detail page while a cancelled run is still stopping
- **THEN** the console SHALL offer "Cancel run" again, and using it SHALL succeed without error
