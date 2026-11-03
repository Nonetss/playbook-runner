## 1. Database

- [x] 1.1 Add `packages/db/src/schema/infisical-connections.ts`, export it from the schema barrel, add `jobs.infisicalConnectionId` (`onDelete: "restrict"`) and a row factory in `packages/db/testing/rows.ts`; verify with `bun run check-types`. Do not generate a migration.
- [x] 1.2 **User:** generate and apply the migration; the agent stops here until the user confirms it is done, and never runs `db:generate`, `db:push` or `db:migrate`.

## 2. Connections API

- [x] 2.1 Create `packages/api/src/v1/infisical-connections/{input,output,handler,router}.ts` with CRUD, the encrypted secret, `publicColumns`, optional secret on update and `CONFLICT` on delete when a job references the connection; mount it as `infisicalConnections` in `src/v1/router.ts`; verify `tests/v1/router.test.ts` still passes (no anonymous access).
- [x] 2.2 Add `tests/v1/infisical-connections/handler.test.ts` covering: ciphertext written, secret absent from outputs, update without secret leaves the column untouched, `NOT_FOUND`, and `CONFLICT` with nothing deleted; verify with `bunx turbo run test --filter=@playbook-runner/api`.
- [x] 2.3 Add a schema test rejecting non-`http(s)` URLs and empty fields with `BAD_REQUEST`; verify in the same test run.

## 3. Run wiring (backend and proto)

- [x] 3.1 Add `InfisicalAuth` and `optional InfisicalAuth infisical = 5` to `proto/run.proto`; verify `bun run generate-grpc` and `bun run check-types` pass.
- [x] 3.2 Extend `resolveRun` with an optional connection id that decrypts the secret, returns `infisical` in the bundle and throws `ResolveRunNotFoundError` when unknown; verify with new cases in `tests/v1/run/resolve.test.ts`.
- [x] 3.3 Add `infisicalConnectionId` to `runInput.run` and forward `bundle.infisical` from `stream-handler.ts`; verify in `tests/v1/run/stream-handler.test.ts` that the gRPC request carries it, and omits it with no connection.
- [x] 3.4 Add `infisicalConnectionId` to job input and output, rejecting an unknown id with `BAD_REQUEST`; verify in `tests/v1/jobs/handler.test.ts` that nothing is written on rejection.
- [x] 3.5 Pass the job's connection through `jobs/executor.ts`; verify in `tests/v1/jobs/executor.test.ts` that the request carries it.

## 4. Runner

- [x] 4.1 Add `infisicalsdk` to `apps/ansible/pyproject.toml` and update `uv.lock`; verify with `uv sync --frozen` and `bunx turbo run test --filter=ansible`.
- [x] 4.2 Add `app/services/ansible/infisical.py` mapping `InfisicalAuth` to the four variables, and merge them into `envvars` in `_run_bundle`; verify with a test for the exact variable names and no variables without a connection.
- [x] 4.3 Add `redact` to `AnsibleRunnerConfig` and deep-replace in `AnsibleRunner.stream`'s handler before logging and queueing; verify with a test using nested strings, and an unchanged event when `redact` is empty.
- [x] 4.4 Add a test that a materialized run's directory, including `env/envvars`, is gone after `cleanup`; verify with `pytest`.
- [x] 4.5 Install `infisical.vault:1.2.3` into `/usr/share/ansible/collections` in `apps/ansible/Dockerfile` and `Dockerfile.dev`; verify by building both images and running `ansible-galaxy collection list infisical.vault` as the runtime user.

## 5. Frontend

- [x] 5.1 Add the `infisical` surface to `app-surfaces.ts` and the `ansible` section, add `/ansible/infisical`, en/es locales and a `surface-search-sources.ts` entry; verify with `bun run check-types` and the frontend unit tests.
- [x] 5.2 Create `features/infisical` (page, definition, `FormDialog` form, hook) with the `no_log` and least-privilege notice, and the secret field empty and optional on edit; verify it in the running app.
- [x] 5.3 Add the connection select to the job form and the run playbook page, and send the id through `use-jobs.ts` and `use-run-playbook.ts`; verify it in the running app, including editing a job back to no connection.
- [x] 5.4 Add an E2E spec under `tests/e2e/admin/` for connection create, edit and delete, and the refused delete while a job references it; verify with `bun run test:e2e` against a running backend.

## 6. Documentation

- [x] 6.1 Add the Infisical guide in `apps/site/src/content/docs/{en,es}/` with the lookup example, `no_log`, least privilege, lookup versus module, concurrent-run limits and the warning against setting `INFISICAL_*` on the runner; verify with `bun run --filter site build`.
- [x] 6.2 Update `AGENTS.md` (feature list, proto and runner notes) and `apps/ansible/README.md` (manual collection install for `dev:local`); verify the commands in the README work in native dev.

## 7. Final verification

- [ ] 7.1 Run `bunx biome ci .`, `bun run check-types` and `bun run test`; all must pass.
- [x] 7.2 In the built image, run an inline and a Git-sourced playbook with a connection against a real or stubbed Infisical; verify the lookup returns a secret, a printed client secret appears masked, `no_log` output is empty, and a run without a connection has no `INFISICAL_*` variable.
