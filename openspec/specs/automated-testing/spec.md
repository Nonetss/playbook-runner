# Automated Testing

## Purpose

Give the repository a fast, self-contained automated test suite for its security-sensitive pure logic (backend API and Ansible runner) that developers run with one command and CI enforces on every change.

## Requirements

### Requirement: One command runs every unit test
`bun run test` at the repository root SHALL run the unit tests of the backend API package, of the frontend and of the Ansible service. It SHALL exit with a non-zero status when any test fails. Each of those workspaces SHALL also expose its own `test` script so its tests can be run in isolation. Generated gRPC stubs that a test suite needs SHALL be produced as part of the task, not as a manual prerequisite. The frontend's unit tests and its end-to-end specs SHALL live in separate directories so the unit command never loads an end-to-end spec.

#### Scenario: All tests pass
- **WHEN** a developer runs `bun run test` on a clean checkout after `bun install` and `uv sync` in `apps/ansible`
- **THEN** the API, frontend and Python test suites SHALL run and the command SHALL exit with status 0

#### Scenario: A failing test fails the command
- **WHEN** any unit test fails
- **THEN** `bun run test` SHALL exit with a non-zero status and report the failing test

#### Scenario: Frontend unit run ignores end-to-end specs
- **WHEN** the frontend's `test` script runs
- **THEN** it SHALL load only the frontend unit tests and never a Playwright spec

### Requirement: Unit tests need no external services
Unit tests SHALL NOT require PostgreSQL, the Ansible gRPC service, the gateway, the backend, Docker, network access, or the developer's `.env` files, and SHALL give the same results whether or not those `.env` files exist or the shell exports their variables. Configuration they depend on SHALL be supplied by the test setup and SHALL overwrite any value inherited from the shell. Code under test that queries the database SHALL run against a test-only stand-in that records the reads and writes and returns results the test supplies; code that calls the Ansible service SHALL run against a programmable stand-in of the gRPC client that never opens a channel. Files they create SHALL be confined to per-test temporary directories. Output that depends on the clock or the timezone SHALL be computed under a fixed timezone and, where it depends on "now", a frozen clock.

#### Scenario: Run without services
- **WHEN** `bun run test` runs on a machine with no database, no running apps and no `apps/*/.env` files
- **THEN** every unit test SHALL run and pass

#### Scenario: Shell environment does not leak in
- **WHEN** `bun run test` runs in a shell that exports a real `DATABASE_URL` and `SERVICE_TOKEN`
- **THEN** no test SHALL connect to that database or service and the results SHALL be the same as without them

#### Scenario: Unqueued database access fails loudly
- **WHEN** a handler under test awaits a database operation for which the test supplied no result
- **THEN** the test SHALL fail with an error naming that operation instead of hanging or contacting a database

#### Scenario: No leftovers on disk
- **WHEN** the Python unit tests finish
- **THEN** no run directories, key files or Git mirrors SHALL remain outside the test's temporary directories

### Requirement: Security-sensitive logic is covered
The unit tests SHALL cover at least the following behaviours, each with at least one accepting and one rejecting case where both exist:

- **Credential encryption:** encrypt/decrypt round-trip, rejection of tampered or malformed ciphertext, and pass-through of legacy plaintext.
- **SSH key generation:** a generated key pair is in OpenSSH format and its public key matches the private key.
- **Reserved extra vars:** rejected by the backend validation, case-insensitive, and refused by the runner's run entry point before any Ansible process starts.
- **Inventory names:** charset, length and the `.`/`..` exclusion.
- **Scheduling input:** cron validation and the `forks` bounds.
- **Identifiers:** UUID id validation.
- **Git repository input:** accepted URL transports, commit SHA format, repository id format, and rejection of absolute or parent-escaping repository paths.
- **Run materialisation:** key files with owner-only permissions inside the run's key directory, even for unsafe host names; inventory host variables; Git playbook paths that escape the exported tree are rejected; cleanup removes the run directory.
- **Service-token check:** gRPC calls without the shared token, or with a wrong token, are rejected as unauthenticated; calls with the correct token are allowed.

#### Scenario: Regression in a guarded rule is caught
- **WHEN** a change makes the backend accept the extra var `ANSIBLE_ssh_common_args`
- **THEN** `bun run test` SHALL fail

#### Scenario: Tampered secret is caught
- **WHEN** a change makes decryption accept a ciphertext whose authentication tag was altered
- **THEN** `bun run test` SHALL fail

#### Scenario: Key file escape is caught
- **WHEN** a change lets a host named `../../etc/x` produce a key file outside the run's key directory
- **THEN** `bun run test` SHALL fail

### Requirement: CI enforces lint, types and tests
A GitHub Actions workflow SHALL run on every pull request and on every push to `main`. It SHALL fail when Biome reports a lint or format error, when `bun run check-types` fails, or when `bun run test` fails. The workflow SHALL NOT need repository secrets.

#### Scenario: Failing test blocks a pull request
- **WHEN** a pull request introduces a failing unit test
- **THEN** the test workflow SHALL report a failed status on that pull request

#### Scenario: Clean pull request passes
- **WHEN** a pull request passes lint, type checks and unit tests locally
- **THEN** the test workflow SHALL report a successful status

### Requirement: Every API procedure is covered
Every procedure exposed by the current API version SHALL have unit tests that pin the rules its handler decides. For each procedure the tests SHALL cover, where the behaviour exists:

- **Access:** every procedure other than the declared public ones (health check and auth configuration) rejects an anonymous caller with `UNAUTHORIZED` and a `pending` user with `FORBIDDEN`; the declared public ones accept an anonymous caller.
- **Missing rows:** a single-row read, update or delete of an id that does not exist fails with `NOT_FOUND`.
- **Nothing written on rejection:** after any rejected call, no insert, update or delete has been issued.
- **What is written on success:** the persisted values (including `updatedAt` on updates and never the `id` in the update values), and whether the writes ran inside a transaction.
- **What is returned:** the mapping to the output shape, including that SSH private keys are never read back nor returned, and are stored encrypted rather than in plain text.
- **Domain rules:** Git-sourced playbooks refuse update, move and delete with `FORBIDDEN`; a reserved group name is refused with `BAD_REQUEST`; references to a missing credential or playbook folder are refused with `BAD_REQUEST`; a job that is already running refuses a new run with `CONFLICT`; job runs pagination returns a next cursor only when more rows exist.
- **Integration failures:** a missing service token fails with `SERVICE_UNAVAILABLE` before any gRPC call; a runner refusing for capacity maps to `TOO_MANY_REQUESTS`; a lost run stream maps to `BAD_GATEWAY` on interactive runs and to the job run's error on scheduled runs; repository sync failures map to `BAD_REQUEST`, `TOO_MANY_REQUESTS` or `BAD_GATEWAY` by gRPC status; run resolution failures map to `NOT_FOUND`, `BAD_REQUEST` or `PRECONDITION_FAILED`.
- **Streams:** interactive run streams forward the runner's events in order, drop heartbeat frames and cancel the gRPC call when the consumer stops; scheduled job runs record the runner's events and final status without heartbeat frames; the job-watch stream replays a live run's events to a late subscriber and ends when the run finishes.

#### Scenario: A new protected procedure left public is caught
- **WHEN** a change wires a non-public procedure on the public builder
- **THEN** `bun run test` SHALL fail

#### Scenario: Editing a Git playbook is caught
- **WHEN** a change lets `playbooks.update` succeed on a playbook whose source is Git
- **THEN** `bun run test` SHALL fail

#### Scenario: A write on a missing row is caught
- **WHEN** a change makes a delete of an unknown id return successfully instead of `NOT_FOUND`
- **THEN** `bun run test` SHALL fail

#### Scenario: A leaked private key is caught
- **WHEN** a change makes a credentials read return the private key
- **THEN** `bun run test` SHALL fail

#### Scenario: Heartbeats reaching the browser are caught
- **WHEN** a change stops dropping runner heartbeat frames from an interactive run stream
- **THEN** `bun run test` SHALL fail

### Requirement: Frontend logic is covered by unit tests
The frontend SHALL have unit tests that render in a simulated browser, in Spanish, and cover:

- **Helpers:** every module in the shared `lib` directory that holds a rule (formatting, accent-insensitive matching, recent surfaces, view-state persistence, locale resolution, surface and icon registries).
- **Pure feature modules:** run inventory selection and its URL encoding, the navigation derived from the surface registry, and the navbar search sources.
- **Hooks** that depend only on React and the browser (not on the data-fetching or auth clients).
- **Shared components with logic of their own:** what the user sees and what callbacks receive, queried by role and accessible name in the Spanish copy, without class-name or snapshot assertions.

Storage failures (private mode, quota, malformed JSON) SHALL be covered where a helper promises to degrade instead of throwing.

#### Scenario: A broken search match is caught
- **WHEN** a change makes the accent-insensitive matcher treat `Configuración` and `configuracion` as different
- **THEN** `bun run test` SHALL fail

#### Scenario: A broken run selection URL is caught
- **WHEN** a change makes the run inventory URL lose the selected devices on a round trip
- **THEN** `bun run test` SHALL fail

### Requirement: End-to-end suite covers every product surface
A Playwright suite SHALL cover every product surface reachable from the navigation (inventory devices, groups and credentials; playbooks and folders; scripts; commands; jobs, scheduler and history; configuration and API keys; admin users; profile; dashboard) for a signed-in admin, asserting the Spanish copy. Each spec SHALL create the records it needs through the API and remove them afterwards, so specs can run in any order and repeatedly against the same database. The suite SHALL also run as a non-admin user to assert that admin pages are refused, and as a guest to assert that protected pages redirect to the login. Specs SHALL NOT depend on a reachable SSH host: execution screens are asserted up to the console and its reported outcome. The end-to-end suite SHALL run only on demand, never as part of `bun run test` or CI.

#### Scenario: A surface that stops rendering is caught
- **WHEN** a change breaks the scripts list page and the end-to-end suite is run
- **THEN** the scripts spec SHALL fail

#### Scenario: Specs are repeatable
- **WHEN** the end-to-end suite runs twice in a row against the same database
- **THEN** both runs SHALL pass and no record created by a spec SHALL remain afterwards (the fixed non-admin test account, which setup creates only when missing, is the one exception)

#### Scenario: Admin gate is asserted
- **WHEN** a change lets a non-admin user open `/admin/users` and the end-to-end suite is run
- **THEN** the non-admin spec SHALL fail
