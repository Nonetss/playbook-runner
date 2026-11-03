## 1. Prerequisites

- [x] 1.1 Using the user's existing connection through the running stack, without printing values, confirm that `list_secrets(view_secret_value=False)` returns names and that `GET /api/v1/workspace/<id>` lists environment slugs with a machine identity; record the result in `design.md` and stop to discuss if names without values do not work.
- [ ] 1.2 **User:** finish `add-infisical-integration` (format its `snapshot.json`, run `/opsx:archive`) and confirm; verify `openspec show infisical-secrets --type spec` succeeds.

## 2. Database

- [x] 2.1 Add `playbook_secret_variables`, `job_secret_variables`, `playbooks.infisical_connection_id` and `infisical_environment`, `jobs.infisical_environment` and `infisical_connections.project_id`, keeping `jobs.infisical_connection_id`, and update `packages/db/testing/rows.ts`; verify with `bun run check-types`. Do not generate a migration.
- [x] 2.2 **User:** generate and apply the migration; the agent stops here until the user confirms, and never runs `db:generate`, `db:push` or `db:migrate`.

## 3. Declaration API

- [x] 3.1 Add `projectId` to connection input and output, and change `delete` to also return `CONFLICT` when a playbook references the connection; verify in `tests/v1/infisical-connections/handler.test.ts`.
- [x] 3.2 Add `v1.playbooks.secretVariables.get/set` with name rules (shared with `safeExtravars`), duplicate and unknown connection rejection and transactional replace, working on Git playbooks; verify with new tests in `tests/v1/playbooks/`, including nothing written on rejection and `tests/v1/router.test.ts` for anonymous access.
- [x] 3.3 Add a validated `infisicalEnvironment` and `secretVariables` to run and job input and job output, storing a job's entries in `job_secret_variables` transactionally and rejecting a job that has variables but no effective connection or environment; verify in `tests/v1/run/` and `tests/v1/jobs/handler.test.ts`.

## 4. Run wiring

- [x] 4.1 In `proto/run.proto`, reserve field 5, add `SecretVariable`, `SecretVariables`, `secret_variables = 6` and the two listing RPCs with their messages; verify `bun run generate-grpc` and `bun run check-types` pass.
- [x] 4.2 Extend `resolveRun` to load the declaration, merge run or job entries by name, resolve the connection and environment (override, then playbook), decrypt the secret and raise a precondition error for a connection without a project and a validation error for a missing connection or environment and for an extra var collision; verify each merge rule and error in `tests/v1/run/resolve.test.ts`.
- [x] 4.3 Forward `secret_variables` from `stream-handler.ts` and `jobs/executor.ts`; verify in their tests that requests carry it, omit it without a declaration, and that a job collision becomes the run's error without a gRPC call.
- [x] 4.4 Add `v1.infisicalConnections.environments` and `.secretNames` mapping gRPC failures to `BAD_GATEWAY` and unknown ids to `NOT_FOUND`; verify with tests that outputs hold no values.

## 5. Runner

- [x] 5.1 Rewrite `app/services/ansible/infisical.py` to log in and fetch per path with `cache_ttl=None`, a request timeout and `INFISICAL_TIMEOUT_S`, treating missing and hidden values as errors naming the variable; verify in `tests/test_infisical.py` with a fake SDK, asserting error messages never contain values.
- [x] 5.2 Write `secret-vars.yml` (`0600`, `!unsafe`) from `materialize` and pass it through a new `cmdline` config with `shlex.quote`; verify with a test that runs real `ansible_runner` against a local playbook using values with `{{ }}`, `{% raw %}`, quotes, newlines and a playbook name with spaces and quotes.
- [x] 5.3 Wire `_run_bundle`: fetch, collision re-check, `redact` with values of at least 4 characters plus the client secret, `quiet`, and error frames before Ansible starts; verify with tests for each failure and that `materialize` is not reached after one.
- [x] 5.4 Add a test that no file with values remains after `cleanup`; verify with `pytest`.
- [x] 5.5 Implement the `ListInfisicalEnvironments` and `ListInfisicalSecretNames` RPCs, with an empty environment list on any failure or unexpected shape; verify with tests that responses hold no values.
- [x] 5.6 Remove `infisical_envvars` and its tests; verify with `bunx turbo run test --filter=ansible` and `bunx turbo run check-types --filter=ansible`.

## 6. Frontend

- [x] 6.1 Add the project id field to the connection form and locales; verify in the running app.
- [x] 6.2 Build a shared `features/run` variable rows component (text or secret value, secret picker, rows from the playbook marked and not removable), replacing the extra var rows on the run page and job form; verify with a unit test for its pure row-to-input mapping and `bun run check-types`.
- [x] 6.3 Add the secret variables section to the playbook edit page, with its own save, connection and environment fields, a secret picker, variable name suggestion and a stale row kept visible, enabled for Git playbooks; verify with an E2E spec.
- [x] 6.4 Add the environment select to the run page and job form, starting from the playbook's connection and environment; verify with E2E that declared rows appear filled in, a chosen secret is sent as a secret variable, a typed value as an extra var, and that without a connection only typed values are offered.
- [x] 6.5 Add E2E coverage for the refused delete while a playbook references a connection, next to the job-based test in `tests/e2e/admin/infisical.spec.ts`; verify the spec passes against the running stack.

## 7. Documentation

- [x] 7.1 Rewrite the Infisical guide in `apps/site/src/content/docs/{en,es}/` around secret variables, including the limits and how to pass credentials explicitly to the collection; verify with `bun run --filter site build`.
- [x] 7.2 Update the `AGENTS.md` Infisical notes and add `INFISICAL_TIMEOUT_S` to the configuration docs in both languages; verify every named file and setting exists.

## 8. Final verification

- [ ] 8.1 Run `bunx biome ci .`, `bun run check-types` and `bun run test`; all must pass.
- [ ] 8.2 In the built runner image, run an inline and a Git-sourced playbook with declared secret variables, a variable added at run time and a job with its own, against the user's real Infisical; verify values reach a task, a printed value appears masked in events and logs, a secret containing `{{ }}` arrives literally, a missing secret stops the run before Ansible, and the run directory is removed.
