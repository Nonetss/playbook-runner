## Context

See proposal.md for motivation and specs/ansible-vault/spec.md for the behaviour.

Facts from the code that shape the approach:

- A Git run's source travels whole: `resolveGitSource` (`run/resolve.ts`) builds `ResolvedGitSource`, and both `run/stream-handler.ts` and `jobs/executor.ts` send `playbook: bundle.playbook`. The repository's SSH key already reaches the runner this way, as `GitSource.private_key`.
- `materialize` writes per-run material into the run directory, which `cleanup` deletes in a `finally`, after Ansible and its leftover workers have stopped. `secret-vars.yml` is written there with mode `0600`.
- The repository's `ansible.cfg` is ignored: `ANSIBLE_CONFIG` points to an empty runner-controlled file, so a repository cannot configure Vault itself.
- Redaction only covers values the runner knows (`masked_values`, `redact`). Vault decrypts inside Ansible.
- `is_playbook` (`git/discover.py`) only accepts a YAML list. A fully encrypted file parses as a scalar, so discovery already skips it, but such a file can still be reached through `import_playbook`.
- `retarget_plays` treats that same scalar as "no plays", finds nothing to rewrite and reports success, so an imported encrypted playbook would silently keep its own `hosts`.

## Goals / Non-Goals

**Goals:**

- Reuse the existing paths for per-repository secrets and per-run files.
- Leave Infisical, `stream-handler.ts` and `executor.ts` untouched.

**Non-Goals:**

- Masking decrypted values. It would mean decrypting the repository in the runner to learn them.
- Showing variables from encrypted `vars_files` in the run form. Discovery does not decrypt.
- Rotating or recovering a password from the app, beyond replacing it.

## Decisions

### One nullable column on `playbook_repositories`

`vault_password` holds the `encryptSecret` output. Alternatives: a `vault_passwords` resource shared between repositories, or a one-to-many table for Vault ids. Both need their own pages and are only justified by several passwords per repository, which is out of scope. If Vault ids are needed later, the column can migrate to a table without changing how runs receive the password.

### The password travels in `GitSource`

A new `optional string vault_password` on `GitSource`, set by `resolveGitSource` from `decryptSecret`. Alternative: a field on `RunBundleRequest`, which needs changes in both callers and could be sent with inline playbooks. Inside `GitSource`, "only Git playbook runs receive it" holds by construction, and sync and listing RPCs have different request messages.

### Handed to Ansible through `ANSIBLE_VAULT_PASSWORD_FILE`

`_materialize_git` writes `run_dir/vault-password` with mode `0600` and adds the variable to the run's `envvars`, next to `ANSIBLE_CONFIG`. Alternative: `--vault-password-file` in `cmdline`, which holds a single value today and would have to be merged with `-e @secret-vars.yml`.

The file must never be executable, because Ansible runs an executable password file as a script. `0600` guarantees that, and a test asserts it. The file lives in `run_dir`, outside `project_dir`, so repository content cannot collide with it.

This is per run: the variable is never set on the runner process.

### Reject passwords with surrounding whitespace

Ansible strips a password file's content, so a password with surrounding whitespace would silently not match. The input schema refuses it instead of storing something that can never decrypt.

### Update semantics: omitted keeps, null removes

`vaultPassword` in `repositoriesInput.update` is nullish: undefined keeps, null clears, a string replaces. The handler encrypts before `.set()` and must drop an undefined key so that the column is not touched. This is the same "empty keeps" behaviour as the Infisical client secret, plus an explicit way to remove.

### Output maps to `hasVaultPassword`

Every handler returning a row (`create`, `list`, `get`, `update`, `delete`, and `sync.ts`) goes through one mapper that replaces the column with a boolean. The output schema would strip an unknown key anyway; the mapper makes the absence explicit and is what the tests assert.

### Refuse encrypted playbook files in `retarget_playbook`

`retarget_playbook` checks each visited file for the `$ANSIBLE_VAULT;` header first and raises a dedicated error naming the file relative to the project. `materialize` already cleans up and re-raises, and `_run_bundle` turns it into a `RunBundleResponse(error=…)` next to the `GitError` handler. Alternative: decrypt to retarget, which would then have to write decrypted plays to disk.

It is a refusal rather than the existing "log and continue" path because that path leaves a play on its own `hosts`, and here the runner knows why before anything runs.

### Mask the password itself

`_run_bundle` adds it to `redact` through `masked_values`, which today only runs when there are secret variables, so the construction has to allow either source. `masked_values` keeps its 4-character minimum.

### Report failures on the playbook itself as an `error` frame

Verification showed that Ansible's message for a vaulted file it cannot decrypt only reached the container logs: `event_payload` reads `res`, and this message is in the display event's `stdout`. `_stream_runner` now ends with an `error` frame carrying that text when the run failed, Ansible displayed an error and no host reported a failure. Alternative: forwarding the event and teaching the console and the job page to show it, which touches the API and the frontend, while the `error` frame already reaches both. Ansible also displays errors for failed tasks, so those keep ending in `done` with their own result.

### Keep the message of an interactive error frame

`toEventIterator` threw a plain `Error` for an `error` frame, which oRPC turns into a generic `INTERNAL_SERVER_ERROR`, so no interactive run could show one: not this failure, not the encrypted playbook refusal, not an Infisical failure. A dedicated `RunFailedError` is mapped by `interactive()` to `UNPROCESSABLE_CONTENT`, because the runner understood the request and refused or could not process that playbook; `BAD_GATEWAY` already means a lost connection whose hosts may have kept going.

## Risks / Trade-offs

- [A task printing a decrypted value leaves it in the console and in `job_runs`] → Stated in the form and the docs; tasks need `no_log`. This is the main difference from Infisical, and the docs keep recommending Infisical for new secrets.
- [A playbook task on `localhost` can read the password file during the run, which unlocks everything encrypted with it, including older commits] → Same exposure as SSH keys and `secret-vars.yml` in the run directory. Documented; whoever can change a repository's playbooks can already reach its secrets.
- [An encrypted file behind a templated `import_playbook` path is not refused, because the runner does not follow templated imports] → Its plays keep their own `hosts`, like any templated import today. Documented with the rule about `hosts`.
- [The password in the gRPC request] → Same trust boundary as `private_key`, inside the internal network with the service token.
- [`ANSIBLE_VAULT_PASSWORD_FILE` not behaving as expected through `ansible-runner`] → Task 3.3 runs a real `ansible-playbook` before anything else depends on it; the fallback is merging into `cmdline`.

## Migration Plan

1. The user generates and applies the migration adding the nullable column. Existing repositories keep working without a password.
2. Deploy backend and Ansible service together, since the proto field is optional and either side alone simply does not use it.

Rollback: redeploy the previous images. The column stays unused and can be dropped by a later migration.
