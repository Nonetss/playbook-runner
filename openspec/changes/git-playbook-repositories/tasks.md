## 1. Data model (user generates and applies the migration)

- [x] 1.1 Propose schema changes to the user: `playbook_repositories` table, `playbooks.source|repository_id|path|missing` + unique `(repository_id, path)`, `job_runs.commit_sha`
- [x] 1.2 After explicit approval, add `packages/db/src/schema/playbook-repositories.ts`, update `playbooks.ts`, `jobs.ts` and the schema barrel
- [ ] 1.3 Stop and ask the user to generate/apply the migration; `bun run check-types` passes

## 2. gRPC contract

- [x] 2.1 Add `GitSource`, `optional GitSource git` on `Playbook`, and `SyncRepository` request/response + RPC in `proto/run.proto`
- [x] 2.2 Regenerate TS (`bun run generate-grpc`) and Python stubs; check-types on both sides

## 3. Ansible service

- [x] 3.1 Install `git` in `apps/ansible/Dockerfile`; add `GIT_TIMEOUT_S`, `GIT_MAX_REPO_MB`, mirror dir `STATE_DIR/repos` to `core/config.py`
- [x] 3.2 `services/git/mirror.py`: per-repository lock, `clone --mirror`/`fetch --prune` with `GIT_SSH_COMMAND` (temp key file 0600, `known_hosts` + `SSH_HOST_KEY_POLICY`), timeout, size check, resolve branch head
- [x] 3.3 `services/git/discover.py`: walk subdir with exclusions, parse YAML safely, keep play lists, cap content size
- [x] 3.4 Implement `SyncRepository` in the gRPC servicer with a small separate semaphore; map failures to `UNAVAILABLE`/`INVALID_ARGUMENT`/`NOT_FOUND`
- [x] 3.5 `materialize.py`: Git branch that ensures the commit exists (fetch if missing), `git archive | tar -x` into `<run_dir>/project`, validates `path` stays inside the tree, sets `project_dir` and playbook path
- [x] 3.6 Force a runner-controlled `ANSIBLE_CONFIG` for Git runs; confirm cleanup removes the exported tree and key files
- [x] 3.7 BasedPyright + Ruff clean

## 4. Backend API

- [x] 4.1 `packages/api/src/v1/repositories/{input,output,handler,router}.ts`: list/get/create/update/delete with URL + credential validation, mounted as `repositories` in `v1/router.ts`
- [x] 4.2 `repositories/sync.ts` + `sync` procedure: decrypt credential, call `SyncRepository`, upsert playbooks by `(repository_id, path)`, flag missing, store commit/sync time/error in one transaction
- [x] 4.3 Repository delete: remove playbooks (cascade) and ask the runner to drop the mirror (or lazy GC by id)
- [x] 4.4 `playbooks` handlers: expose `source|repositoryId|path|missing` in outputs; `update|move|delete` throw `errors.FORBIDDEN()` for Git playbooks; create forces `inline`
- [x] 4.5 `run/resolve.ts`: attach `GitSource` (url, last commit, path, decrypted key) for Git playbooks; reject missing ones with `PRECONDITION_FAILED`
- [x] 4.6 `jobs/executor.ts`: persist `commit_sha` on the job run; expose it in job-run outputs
- [ ] 4.7 Verify through `/scalar`: create, sync, list, run a Git playbook

## 5. Frontend

- [x] 5.1 Hooks `use-repositories.ts` (list, create, update, delete, sync) in `features/playbooks/hooks`
- [x] 5.2 Repository `FormDialog` (name, URL, branch, subdir, credential) and repository definition card (commit short sha, last sync, sync action, error `InlineAlert`)
- [x] 5.3 Playbooks browser: show repositories as folder-like entries; inside, list Git playbooks with read-only marker and missing state; hide edit/move/delete and drag for them
- [x] 5.4 Playbook detail/run pages and job forms show source (repo + path + commit); history shows `commit_sha`
- [x] 5.5 i18n strings; design-system checks (no raw palette colours); `astro check` passes

## 6. Validation and docs

- [ ] 6.1 Playwright E2E: register a public repo fixture, sync, see playbooks read-only, run one (or mocked where network is unavailable)
- [ ] 6.2 Manual test with a private repo over SSH and a repo using roles/templates
- [x] 6.3 Update README, AGENTS.md (new feature, env vars, `STATE_DIR/repos`) and compose docs
- [x] 6.4 `bun run check`, `bun run check-types`, `openspec validate git-playbook-repositories`
