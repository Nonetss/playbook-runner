## Purpose

Give the repository a fast, self-contained automated test suite for its security-sensitive pure logic (backend API and Ansible runner) that developers run with one command and CI enforces on every change.

## ADDED Requirements

### Requirement: One command runs every unit test
`bun run test` at the repository root SHALL run the unit tests of the backend API package and of the Ansible service. It SHALL exit with a non-zero status when any test fails. Each of those workspaces SHALL also expose its own `test` script so its tests can be run in isolation. Generated gRPC stubs that a test suite needs SHALL be produced as part of the task, not as a manual prerequisite.

#### Scenario: All tests pass
- **WHEN** a developer runs `bun run test` on a clean checkout after `bun install` and `uv sync` in `apps/ansible`
- **THEN** both the TypeScript and the Python test suites SHALL run and the command SHALL exit with status 0

#### Scenario: A failing test fails the command
- **WHEN** any unit test fails
- **THEN** `bun run test` SHALL exit with a non-zero status and report the failing test

### Requirement: Unit tests need no external services
Unit tests SHALL NOT require PostgreSQL, the Ansible gRPC service, the gateway, Docker, network access, or the developer's `.env` files. Configuration they depend on SHALL be supplied by the test setup. Files they create SHALL be confined to per-test temporary directories.

#### Scenario: Run without services
- **WHEN** `bun run test` runs on a machine with no database, no running apps and no `apps/*/.env` files
- **THEN** every unit test SHALL run and pass

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
