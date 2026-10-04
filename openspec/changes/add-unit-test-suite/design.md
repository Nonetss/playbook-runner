## Context

See proposal.md for the motivation. The facts below shape the approach.

- **Environment validation at import.** `packages/api` exports raw TypeScript and uses `#` subpath imports. Several target modules import `@playbook-runner/env/server`, which runs `createEnv` (with `dotenv/config`) when imported and fails unless every required variable is set. Examples: `credentials/crypto.ts` reads `env.CREDENTIALS_ENCRYPTION_KEY`, and `run/proto.ts` imports types only. `@playbook-runner/db` creates its Drizzle client at import time, but `drizzle(url)` does not connect until the first query.
- **`isValidCron` depends on the Bun runtime.** It calls `Bun.cron.parse`, so it can only be tested under Bun.
- **The Ansible settings singleton.** The service reads configuration from `app.core.config.settings`, a `pydantic-settings` singleton created when the module is imported. It reads `apps/ansible/.env` from the working directory when that file exists. The modules under test read the following fields at call time:
  - `run_scratch_dir`
  - `state_dir`
  - `ssh_host_key_policy`
  - `ansible_user`
  - `git_timeout_s`
- **Python gRPC stubs are generated.** They are produced into the gitignored `app/grpc/gen/` by `generate-grpc`. `app/grpc/stubs.py` imports `run_pb2` through a path shim.
- **Python dependencies and type checking.** `grpc_toolkit` is an editable path dependency of `apps/ansible` and has no environment of its own. BasedPyright checks only `apps/ansible/app` (`pyrightconfig.json`), so a `tests/` directory next to `app/` is not type-checked unless it is added.
- **Turbo task conventions.** Turbo already wires `generate-grpc` as a dependency of `check-types`/`build`. The only workflow today is `docker-build.yml`.

## Goals / Non-Goals

**Goals:**
- Zero new TypeScript dependencies, and only `pytest` on the Python side.
- Tests read like the code they cover: colocated, small, and with no shared fixtures beyond environment setup.
- Running a single package's tests must be as easy as running all of them.

**Non-Goals:**
- No refactors made only for testability. Private functions are tested through their public callers, or left untested. For example, `toSyncError` and `interactive` stay unexported and will be covered by the later integration change.
- No mocking framework, no coverage tooling, no snapshot tests.

## Decisions

### 1. `bun test` for TypeScript, colocated `*.test.ts`

Bun's runner ships with the pinned Bun 1.3.14, resolves `#` subpath imports natively, and provides the `Bun` global that `isValidCron` needs. Tests live next to the code (`packages/api/src/v1/credentials/crypto.test.ts`) and import it the way sibling modules do (`#v1/credentials/crypto`).

- **Type checking.** They are type-checked by the existing `tsc --noEmit -p .`. The base tsconfig already has `types: ["bun"]`, so `bun:test` is typed.
- **Not bundled.** No entry point imports them, so `tsdown` never bundles them.
- **Frontend unaffected.** `astro check` only follows imports from the frontend, so the frontend's own type check is unaffected.

*Alternatives:*
- Vitest: a new dependency, and it would need a resolver config for `#` imports and a shim for `Bun.cron`.
- A separate `test/` tree: it hides which modules are covered and adds an import style the repo doesn't use.

### 2. Environment through a preload, not `SKIP_ENV_VALIDATION`

`packages/api/test/setup.ts` assigns deterministic test values to `process.env` for every required server variable:

- `DATABASE_URL` points at an unreachable host that is never queried.
- `BETTER_AUTH_SECRET` and `SERVICE_TOKEN` are 32+ characters.
- `CREDENTIALS_ENCRYPTION_KEY` is a fixed 32-byte base64 key.
- `NODE_ENV=test`.

The `test` script runs `bun test --preload ./test/setup.ts`. The preload always overwrites these values, so a developer's exported shell variables cannot leak into the tests. `dotenv/config` never overrides variables that are already set, and `packages/api` has no `.env`.

*Alternative:* `SKIP_ENV_VALIDATION=1`. It would still leave `CREDENTIALS_ENCRYPTION_KEY` undefined, and it would hide breakage in the env schema.

*Alternative:* a package-level `bunfig.toml` with `[test] preload`. Rejected: the flag in the script is explicit, and the root `bunfig.toml` stays the only bunfig in the repo.

The env object is created once at import, so the tests do not swap keys at runtime. Instead:
- **Tamper cases:** the test alters the IV, tag or ciphertext bytes of a value encrypted by the module. Each altered value must throw on decrypt.
- **Wrong-key case:** the test builds a `v1:` value itself with `node:crypto` and a different key. That value must also fail to decrypt.

### 3. `pytest` in `apps/ansible`, tests in `apps/ansible/tests/`

- **Dependency.** `pytest` is added to the `dev` dependency group, and the production image uses `--no-dev`.
- **Configuration.** `[tool.pytest.ini_options]` sets `testpaths = ["tests"]` and `pythonpath = ["."]`, so `app.*` imports resolve.
- **Script.** The package script is `"test": "uv run pytest"`.
- **`grpc_toolkit` tests.** The `TokenAuthInterceptor` tests live in `apps/ansible/tests/test_grpc_toolkit_auth.py`, because that is the only environment where `grpc_toolkit` is installed. *Alternative:* giving `python/grpc-toolkit` its own dev group and venv. That means a second Python environment for one 57-line module.
- **Async tests.** Async code (the interceptor, the `RunBundle` guard) is driven with `asyncio.run` inside plain test functions, using small hand-written fakes:
  - a `handler_call_details` with `method`/`invocation_metadata`;
  - a `context` with `peer()` and an `abort()` that raises.

  This avoids a `pytest-asyncio` dependency for two tests.
- **Type checking.** `tests/` is not added to BasedPyright. Tests rely on fakes that would need many casts, and `basic` mode on `app/` already guards the production code. Ruff formats and lints them through the existing `format` script.

### 4. Settings isolation through an autouse fixture

`tests/conftest.py` has an autouse fixture that `monkeypatch.setattr`s the `settings` singleton:

- `run_scratch_dir` → `tmp_path / "runs"`
- `state_dir` → `tmp_path / "state"`
- `ssh_host_key_policy` → `"accept-new"`
- `ansible_user` → `"ansible"`

It patches the object that every module already imported, so no module reloads are needed. Any local `.env` value is irrelevant because the fixture overrides each field the tested code reads. Tests that exercise other policies set the field themselves.

### 5. Git tests against a real local mirror

`list_tree`, `read_blob`, `export_tree` and `discover` are tested against a real repository:

1. A small working repository is built in `tmp_path` with the `git` CLI. It contains playbooks, `roles/`, a hidden directory, an oversized file and a symlink.
2. The commits are created with `-c user.name/-c user.email` and `GIT_CONFIG_GLOBAL=/dev/null`.
3. `git clone --mirror` copies it to `mirror_path(<uuid>)` under the patched `state_dir`.

This exercises the real `ls-tree` parsing and `tar` extraction filter rather than a reimplementation. `sync`/`list_branches` (network) stay out of scope. The tests only need `git` on `PATH`, which GitHub runners and the dev images have.

### 6. The `RunBundle` reserved-extravars guard is tested through the servicer

The test calls `RunnerServicer().RunBundle(request, fake_context)` with a real `RunBundleRequest` whose extravars contain `ANSIBLE_ssh_args`. It collects the generator and asserts two things:
- Exactly one `error` response is yielded.
- `materialize` (monkeypatched to raise if called) was never reached.

This verifies the spec's "before any Ansible process starts" without spinning up a gRPC server.

### 7. Turbo `test` task and root script

`turbo.json` gains:
- `"test": { "cache": false }`, uncached. Test results depend on the `git`/Bun runtime, and fast re-runs are cheap.
- `"ansible#test": { "dependsOn": ["generate-grpc"], "cache": false }`.

`@playbook-runner/api` needs no stubs at runtime, because `run/proto.ts` only has `import type` from them.

The root `package.json` adds `"test": "turbo test"`. Workspaces without a `test` script are skipped by Turbo. Before editing, the installed Turbo docs (`node_modules/turbo/docs`) are checked for task syntax, as `AGENTS.md` requires.

### 8. CI workflow `.github/workflows/test.yml`

It triggers on `pull_request` and on `push` to `main`, with read-only `contents` permission. A single `ubuntu-latest` job runs these steps:

1. `actions/checkout`.
2. `oven-sh/setup-bun` pinned to `1.3.14`.
3. `astral-sh/setup-uv` with Python 3.12.
4. `bun install --frozen-lockfile`.
5. `uv sync --frozen` in `apps/ansible`.
6. `bunx biome ci .`. This is the read-only variant: `bun run check` uses `--write` and would never fail.
7. `bun run check-types`.
8. `bun run test`.

Every action is pinned to its major version, and the workflow uses no secrets. `SKIP_ENV_VALIDATION=1` is set at job level only if `check-types` turns out to need it: the frontend `astro check` may import env at config time. This is verified during implementation and documented in the workflow.

*Alternative:* adding the job to `docker-build.yml`. It runs only on `main`/tags, not on PRs, and mixes publishing with verification.

### 9. Documentation

`AGENTS.md`:
- **Commands:** add `bun run test`, plus per-package `bun run --filter @playbook-runner/api test` and `bun run --filter ansible test`.
- **Misc:** replace "No unit-test framework — don't try `bun test`" with the conventions:
  - colocated `*.test.ts` under `bun test` with the preload;
  - `apps/ansible/tests/` with pytest;
  - no external services in unit tests.

`README.md` gets a short Testing section.

## Risks / Trade-offs

- **[Risk]** `Bun.cron.parse` behaviour may change across Bun versions. → Tests assert only clearly valid and clearly invalid expressions, and Bun is pinned in `packageManager` and CI.
- **[Risk]** `astro check` or `basedpyright` in CI may fail for environment reasons unrelated to the tests: missing generated stubs, env at import. → `check-types` already depends on `generate-grpc`. Fixing CI-only setup issues is part of the CI task, and any workaround is documented in the workflow.
- **[Risk]** File-permission assertions (`0600`/`0755`) fail on filesystems without POSIX modes. → Tests run on Linux (dev, CI, containers). They are skipped with `pytest.mark.skipif(os.name != "posix")`.
- **[Trade-off]** Private mappers stay untested in this change instead of being exported for tests. → Covered by the planned integration-test change.
- **[Trade-off]** Uncached Turbo `test` runs every time. → The suites are expected to finish in seconds. This can be revisited if they grow.

## Migration Plan

Additive only.
- **Rollout:** merge, and the new workflow starts reporting on the next PR. The repository owner can then mark it as a required check in branch protection (a manual GitHub setting, not part of this change).
- **Rollback:** delete the workflow and the test files. No runtime component depends on them.
