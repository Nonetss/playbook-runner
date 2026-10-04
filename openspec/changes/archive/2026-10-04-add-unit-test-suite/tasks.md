## 1. TypeScript test setup (`packages/api`)

- [x] 1.1 Create `packages/api/test/setup.ts` per design §2. It always overwrites `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NODE_ENV=test`, `SERVICE_TOKEN` and a fixed 32-byte base64 `CREDENTIALS_ENCRYPTION_KEY`. Add `"test": "bun test --preload ./test/setup.ts"` to `packages/api/package.json`. Verify: a trivial `src/v1/schemas.test.ts` passes with `bun run --filter @playbook-runner/api test`, with no `.env` present.
- [x] 1.2 Verify `bun run --filter @playbook-runner/api check-types` type-checks the test files (`bun:test` types resolve). Verify `bun run --filter backend build` still succeeds and `dist/index.mjs` contains no test code (`grep -c "bun:test" apps/backend/dist/index.mjs` returns 0).

## 2. TypeScript unit tests

- [x] 2.1 `src/v1/schemas.test.ts`: `idSchema` accepts a UUID and rejects `""`, `"1"` and a non-hex 36-char string. Verify the tests pass.
- [x] 2.2 `src/v1/credentials/crypto.test.ts`:
  - round-trip, including unicode and multiline PEM;
  - output starts with `v1:` and has 4 `:`-separated parts;
  - two encryptions of the same plaintext differ (random IV);
  - `isEncrypted`;
  - legacy plaintext is returned unchanged;
  - malformed `v1:` values throw;
  - altered tag, IV or ciphertext throws;
  - a `v1:` value built with a different key throws.

  Verify the tests pass. Then temporarily remove `setAuthTag` locally and confirm the tamper tests fail.
- [x] 2.3 `src/v1/credentials/ssh-key.test.ts`:
  - the private key has the OpenSSH PEM armour and 70-col wrapping;
  - the public line is `ssh-ed25519 <b64> [comment]`;
  - the public blob embedded in the private key equals the public line's blob;
  - `node:crypto` `createPublicKey` on the raw 32-byte key matches;
  - the comment is optional.

  Verify the tests pass.
- [x] 2.4 `src/v1/run/extravars.test.ts`:
  - accepts `app_version` and `_x`;
  - rejects `ansible_host`, `ANSIBLE_ssh_common_args`, `Ansible_become`, `1abc`, `a-b` and `""`;
  - rejects non-string values.

  Verify the tests pass.
- [x] 2.5 `src/v1/inventory/name.test.ts`:
  - accepts `web-01.prod`, `a` and a 64-char name;
  - rejects a 65-char name, `.`, `..`, `../../x`, `a b`, `a/b` and `""`.

  Verify the tests pass.
- [x] 2.6 `src/v1/jobs/cron.test.ts`:
  - `isValidCron` accepts `*/5 * * * *` and `@daily`, and rejects `not a cron`, `* * *` and `61 * * * *`;
  - `cronExpression` accepts `null`, `undefined`, `""`, `"  "` and a valid expression with surrounding spaces, and rejects an invalid one;
  - `forks` accepts 1 and 50, and rejects 0, 51 and 1.5.

  Verify the tests pass.
- [x] 2.7 `src/v1/run/proto.test.ts`:
  - `toProtoHost` maps `privateKey` → `private_key`;
  - `taskEventToRecord` omits undefined fields and keeps `changed: false`/`rc: 0`;
  - `toEventIterator` yields task records, returns the `done` payload, throws on an `error` frame, and throws when the stream ends without a terminal frame (use hand-built async generators).

  Verify the tests pass.

## 3. Python test setup (`apps/ansible`)

- [x] 3.1 Add `pytest` to the `dev` dependency group (`uv add --dev pytest`, which updates `uv.lock`). Add `[tool.pytest.ini_options]` with `testpaths = ["tests"]` and `pythonpath = ["."]`, and `"test": "uv run pytest"` in `apps/ansible/package.json`. Verify `uv sync --frozen` succeeds and `uv run pytest --collect-only` runs.
- [x] 3.2 Create `apps/ansible/tests/conftest.py` with the autouse settings fixture from design §4 (`run_scratch_dir`, `state_dir`, `ssh_host_key_policy`, `ansible_user` → `tmp_path`-based values). Add a `git_mirror` fixture (design §5) that builds a working repo with the `git` CLI under an isolated git config and clones it with `--mirror` to `mirror_path(<uuid>)`. The repo contains:
  - `site.yml` and `nested/web.yaml` plays;
  - `roles/x/tasks/main.yml`;
  - `.github/ci.yml`;
  - a non-playbook `vars.yml`;
  - an oversized `big.yml`;
  - a symlink.

  The fixture returns the repository id and commit SHA. Verify with a smoke test that the fixture yields a valid 40-char SHA.

## 4. Python unit tests

- [x] 4.1 `tests/test_git_validation.py`:
  - `validate_url` accepts `https://`, `ssh://` and `git@host:org/repo.git`, and rejects `file:///x`, `ext::sh -c x`, `http://x`, `/tmp/repo` and URLs with whitespace;
  - `validate_commit` takes 40/64 lowercase hex and rejects short, uppercase or non-hex SHAs;
  - `mirror_path` accepts a UUID and rejects `../x`;
  - `safe_repo_path` rejects `""`, `/abs` and `a/../../b`, and accepts `dir/site.yml`;
  - `_classify` maps the documented stderr messages.

  Verify the tests pass.
- [x] 4.2 `tests/test_git_tree.py` (uses `git_mirror`):
  - `list_tree` returns only regular blobs (symlink skipped), with sizes, and honours `subdir`;
  - `read_blob` returns content;
  - `export_tree` extracts the tree into `dest`;
  - an invalid commit raises `GitError`.

  Verify the tests pass.
- [x] 4.3 `tests/test_discover.py`:
  - `is_playbook` handles lists of plays with `hosts`/`import_playbook`, Ansible tags (`!vault`), invalid YAML, empty lists and mappings;
  - `discover` on `git_mirror` returns exactly the playbook files and skips `roles/`, hidden dirs, non-playbooks and files over `MAX_PLAYBOOK_BYTES` (monkeypatch the limit low).

  Verify the tests pass.
- [x] 4.4 `tests/test_materialize.py`:
  - `materialize_hosts` writes one key per host inside `run_dir/keys`, with mode `0600` and a trailing newline, even for the host names `../../etc/x` and `a/b`;
  - the inventory has `ansible_host`/`ansible_user`/`ansible_connection`/key path, `ansible_port` only when set, and `ansible_user` falls back to the setting;
  - `write_script_file`: bash/python extension and shebang, an existing shebang is kept, mode `0755`;
  - `materialize` with an inline playbook writes the playbook under `run_dir` with empty `envvars`;
  - `materialize` with a Git source (on `git_mirror`) exports to `project/` and sets `ANSIBLE_CONFIG` to an empty runner file;
  - a Git `path` of `../escape.yml` or a missing file raises `GitError` and leaves no run dir;
  - `cleanup` removes `run_dir`.

  Mark the permission assertions `skipif(os.name != "posix")`. Verify the tests pass and `tmp_path/runs` is empty after the cleanup cases.
- [x] 4.5 `tests/test_payload_models_policy.py`:
  - `event_payload` maps `res` fields, JSON-encodes non-string `msg`/`stdout`, and adds `stats` only for `playbook_on_stats`;
  - `playbook_from_proto`/`host_from_proto` with and without the optional `git`/`private_key`/`port`, using real `run_pb2` messages;
  - `ssh_envvars` for `accept-new`, `strict` and `off` (known_hosts under the patched `state_dir`).

  Verify the tests pass.
- [x] 4.6 `tests/test_runner_guard.py` (design §6): `RunnerServicer().RunBundle` with extravars `{"ANSIBLE_ssh_args": "x", "ok": "1"}` yields exactly one `RunBundleResponse` with an `error` naming the reserved key. `materialize` is monkeypatched to fail the test if called. Verify the test passes.
- [x] 4.7 `tests/test_grpc_toolkit_auth.py`, driven with `asyncio.run` and fakes (design §3):
  - the correct token returns the original handler;
  - a missing token, a wrong token and an empty expected token return a deny handler;
  - the deny handler matches cardinality (unary vs. unary-stream);
  - invoking it calls `context.abort(UNAUTHENTICATED, …)`;
  - a `None` continuation is passed through.

  Verify the tests pass.

## 5. Turbo, root script and CI

- [x] 5.1 Read the installed Turbo docs (`node_modules/turbo/docs`, per `AGENTS.md`). Add `"test": { "cache": false }` and `"ansible#test": { "dependsOn": ["generate-grpc"], "cache": false }` to `turbo.json`, and `"test": "turbo test"` to the root `package.json`. Verify: after deleting `apps/ansible/app/grpc/gen`, `bun run test` regenerates the stubs and runs both suites green. Verify it also exits non-zero when one test is temporarily broken.
- [x] 5.2 Create `.github/workflows/test.yml` per design §8 (`pull_request` + `push` to `main`, `permissions: contents: read`, Bun 1.3.14, uv + Python 3.12, frozen installs, `bunx biome ci .`, `bun run check-types`, `bun run test`). Add `SKIP_ENV_VALIDATION=1` only if `check-types` needs it, with a comment explaining why. Verify:
  - the YAML parses (`bunx --bun yaml-lint` or `python -c "import yaml; yaml.safe_load(open(...))"`);
  - the same commands succeed locally in a clean shell with no `apps/*/.env` loaded (temporarily move them aside or run in a fresh worktree).
- [x] 5.3 Run `bun run check` and `bun run format`, and confirm Biome and Ruff leave the new files clean. Run `bun run check-types` and confirm it passes across the monorepo.

## 6. Documentation

- [x] 6.1 Update `AGENTS.md` per design §9:
  - **Commands:** add `bun run test` and the per-package variants;
  - **Misc:** replace the "No unit-test framework — don't try `bun test`" line with the test conventions (colocated `*.test.ts` + preload, `apps/ansible/tests/` + pytest, no external services, CI workflow);
  - keep the Turbo managed block intact.

  Add a Testing section to `README.md`. Verify by reading both files: no remaining claim that there is no unit-test framework (`grep -n "don't try \`bun test\`" AGENTS.md` returns nothing).
