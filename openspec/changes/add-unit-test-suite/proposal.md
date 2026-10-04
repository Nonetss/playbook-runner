## Why

The only automated tests are four Playwright specs (login, guest pages, mobile menu). The backend API (~4,300 lines in `packages/api/src/v1`) and the Ansible service (~1,700 lines) have none. CI only builds Docker images, so a regression in the code that guards secrets and execution input ships unnoticed. That code includes credential encryption, reserved extra vars, inventory name rules, Git URL/path validation and key-file materialisation. `AGENTS.md` even tells agents "No unit-test framework — don't try `bun test`". The highest-value first step is fast unit tests for the pure logic, with no database, network or Docker, enforced in CI.

## What Changes

- Add a TypeScript unit-test setup with Bun's built-in runner (`bun test`, no new dependency) in `packages/api`, with a test preload that provides a valid test environment for `@playbook-runner/env/server`.
- Add colocated `*.test.ts` unit tests for the pure modules of `packages/api/src/v1`:
  - `credentials/crypto.ts`: round-trip, `v1:` format, tamper/wrong-key detection, legacy plaintext, malformed values.
  - `credentials/ssh-key.ts`: OpenSSH-format ed25519 key pair whose public key matches the private key.
  - `run/extravars.ts`: reserved `ansible_*` keys, case-insensitive.
  - `inventory/name.ts`: allowed charset, length, `.`/`..`.
  - `jobs/cron.ts`: `isValidCron`, `cronExpression`, `forks` bounds.
  - `run/proto.ts`: `toProtoHost`, `taskEventToRecord`, `toEventIterator`.
  - `schemas.ts`: `idSchema`.
- Add a Python unit-test setup with `pytest` (dev dependency in `apps/ansible`) and tests under `apps/ansible/tests/`:
  - `git/mirror.py` validators: URL transports, commit SHA, repository id, `safe_repo_path`, error classification.
  - `list_tree`/`export_tree` against a local bare repository.
  - `git/discover.py`: candidate paths, playbook detection, size/count limits.
  - `ansible/materialize.py`: owner-only key files inside the key directory, inventory shape, script files, inline and Git playbooks, path-escape rejection, cleanup.
  - `ansible/payload.py`, `ansible/models.py` proto conversion, `ansible/ssh_policy.py`.
  - The `RunBundle` reserved-extravars guard.
  - `grpc_toolkit.auth.TokenAuthInterceptor`.
- Add a `test` script to `packages/api` and `apps/ansible`, a `test` task in `turbo.json` (Ansible depends on its gRPC stub generation), and a root `bun run test`.
- Add `.github/workflows/test.yml`. It runs Biome, `check-types` and `bun run test` on pull requests and pushes to `main`.
- Update `AGENTS.md` (Commands, Misc) and `README.md` to document the test commands and conventions. This replaces the "no unit-test framework" note.

Out of scope, planned as later changes:

- Integration tests against PostgreSQL. When that change happens, the test setup will apply the existing migrations to a throwaway database with Drizzle's migrator, without generating or editing migrations.
- In-process gRPC servicer tests.
- New Playwright flows.
- Coverage thresholds.

## Capabilities

### New Capabilities
- `automated-testing`: how the repository's automated tests are run (`bun run test`), which logic must be covered by unit tests, that unit tests need no external services, and that CI enforces lint, types and tests.

### Modified Capabilities
<!-- None: the tests verify existing requirements (execution-input-safety, ssh-credential-management, playbook-repositories) without changing them. -->

## Impact

- **New files**:
  - `packages/api/src/v1/**/*.test.ts` and `packages/api/test/setup.ts` (preload).
  - `packages/api/bunfig.toml`.
  - `apps/ansible/tests/**`.
  - `.github/workflows/test.yml`.
- **Config**:
  - `packages/api/package.json`, `apps/ansible/package.json` (`test` scripts).
  - `apps/ansible/pyproject.toml` (`pytest` dev dependency, `[tool.pytest.ini_options]`).
  - `apps/ansible/uv.lock`, `turbo.json`, root `package.json` (`test`).
  - `pyrightconfig.json`, only if the tests need to be included or excluded explicitly.
- **Docs**: `AGENTS.md`, `README.md`.
- No application behaviour, API, proto, database schema or migration changes. Production images are unaffected: test files are not imported by any entry point. The Ansible image installs without dev dependencies.
