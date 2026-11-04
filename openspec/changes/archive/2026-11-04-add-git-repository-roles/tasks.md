## 1. Role resolution during runs

- [x] 1.1 Change `_new_run_dir` in `apps/ansible/app/services/ansible/materialize.py` to label the directory with `_safe_prefix`, and verify with a `tests/test_materialize.py` case that a playbook name containing `:` gives a run directory without `:`
- [x] 1.2 Make `_materialize_git` build `ANSIBLE_ROLES_PATH` from the existing `roles/` directories between the playbook and `project_dir`, nearest first, skipping any that resolve outside the tree or contain `:`, and verify with `tests/test_materialize.py` cases for a root `roles/`, two levels, none (variable unset), a symlink escaping the tree and a directory name with `:`
- [x] 1.3 Add a test that runs a local-connection playbook through `ansible_runner.run` with the role at the repository root and with the same role name at two levels, and verify that it passes and the nearest role wins

## 2. Listing roles in the runner

- [x] 2.1 Add `discover_roles` to `apps/ansible/app/services/git/discover.py` following the design's rules, and verify with `tests/test_discover.py` cases for `tasks/main` and `meta/main` markers, a directory that is not a role, nested roles, `collections/`, hidden directories, `subdir` scoping, ordering and the `MAX_ROLES` cap
- [x] 2.2 Read the description from `galaxy_info.description`, and verify with `tests/test_discover.py` cases for a valid description, the 500-character cap, invalid YAML, non-UTF-8 content and an oversized file (the role stays listed in the last three)
- [x] 2.3 Detect `requirements.{yml,yaml}` at the root, in the subdirectory and directly in `roles/` or `collections/` at those levels, and verify with `tests/test_discover.py` cases for each location and for a file elsewhere being ignored
- [x] 2.4 Add the `ListRepositoryRoles` RPC and its messages to `proto/run.proto`, run `bun run generate-grpc`, and verify that the Python and TypeScript stubs contain them
- [x] 2.5 Implement the servicer method in `apps/ansible/app/grpc/services/runner.py` with `ensure_commit`, `discover_roles` and `_GIT_STATUS` mapping, and verify with a test against `git_mirror` for the response and for an unknown commit's gRPC status

## 3. API endpoint

- [x] 3.1 Add `repositoriesOutput.roles` and `repositoriesInput.roles`, and `listRepositoryRoles` in `packages/api/src/v1/repositories/sync.ts` with its early return for a never-synced repository, and verify with `tests/v1/repositories/sync.test.ts` cases for the request sent (including the decrypted key), output mapping, `NOT_FOUND`, the never-synced case making no gRPC call, gRPC errors mapped through `toSyncError`, and nothing written to the database
- [x] 3.2 Wire `repositoriesHandler.roles` and `repositoriesRouter.roles` with its `.route` documentation (`GET`), and verify with `tests/v1/repositories/handler.test.ts` and that `tests/v1/router.test.ts` still only allows the known anonymous procedures
- [x] 3.3 Open `/scalar` or call `/api/v1/repositories/roles` with the backend and Ansible service running, and verify that the endpoint is documented and returns a synced repository's roles

## 4. Frontend

- [x] 4.1 Add the role types to `features/playbooks/types.ts`, a `useRepositoryRoles` hook in `hooks/use-repositories.ts`, and the roles key to `useRepositorySync`'s `extraInvalidate`, and verify with `bun run check-types`
- [x] 4.2 Add the roles block to the collapsible body of `repository-section.tsx` using `Text`, `InlineAlert` and the design tokens, with copy in `locales/es/playbooks.json` and `locales/en/playbooks.json`, and verify with `bun run check-types`, `bunx biome ci .` and both locales containing the same keys
- [x] 4.3 Check the page in the browser with a repository that has roles and a `requirements.yml`, and verify the list, the warning, a collapsed section making no request, a repository without roles showing no block, a failed request keeping the playbooks visible, and a sync refreshing the list, on desktop and at mobile width

## 5. Documentation

- [x] 5.1 Update the Git repositories bullet in `AGENTS.md` with role resolution, `ListRepositoryRoles` and the fact that `requirements.yml` is not installed, and verify that the text matches the implemented names
- [x] 5.2 Document supported layouts, the read-only list, the `requirements.yml` limit and the replaced default role paths in `apps/site/src/content/docs/en/` and `es/`, and verify with `bun run --filter site build` that the site builds and both languages have the same content

## 6. End-to-end verification

- [x] 6.1 Run `bunx biome ci .`, `bun run check-types` and `bun run test`, and verify that all pass
- [x] 6.2 Sync a real repository with `playbooks/site.yml` and a root `roles/` in the Docker dev stack, run it from the UI and as a job against a test device at the unreachable `192.0.2.10` (the fixture role only uses `debug`, which needs no SSH connection), and verify that the role's tasks appear in the console and `job_runs.commit_sha` records the commit
