## Why

Playbook repositories that keep secrets with Ansible Vault cannot run on Playbook Runner: the runner has no password, so using a `!vault` value fails with `Attempt to use undecryptable variable`. The only way out today is to move those secrets to Infisical and rewrite the playbooks, which blocks teams that already rely on Vault.

## What Changes

- A Git playbook repository can store one Vault password. It is encrypted at rest like SSH private keys and the API never returns it, only whether one is set. It can be set, replaced and removed.
- Runs and jobs of that repository's playbooks can decrypt `!vault` values and encrypted variable files. Infisical secret variables keep working unchanged, also in the same run.
- A run that would execute a fully encrypted playbook file, in practice one reached through `import_playbook`, ends before Ansible with a clear error, because the runner could not apply its rule that every play runs on the selection.
- The repository form gets a Vault password field, and the docs drop the rule that Vault does not work.

Known limitation, stated in the docs: the runner cannot mask decrypted Vault values in the run output, because only Ansible sees them. Tasks handling them need `no_log`.

Out of scope: playbooks written in the app, several passwords per repository (Vault ids), and encrypting values from the app.

**Database**: `playbook_repositories` gains a nullable column. The schema edit is part of this change; generating and applying the migration remains the user's step, and it must be applied before the new backend runs.

## Capabilities

### New Capabilities

- `ansible-vault`: storing a repository's Vault password, using it in runs and jobs of that repository's playbooks, refusing fully encrypted playbook files, and how its values behave in the run output.

### Modified Capabilities

- `run-lifecycle`: a run that fails on the playbook itself, before any host reports a failure, tells the user why. This covers every such failure, not only Vault's.

## Impact

- **Database**: `packages/db/src/schema/playbook-repositories.ts` and the `repositoryRow` factory; migration by the user.
- **API**: `repositories` feature (input, output, handler, `sync.ts`) and `run/resolve.ts`. API consumers get a new `hasVaultPassword` field and an optional `vaultPassword` input.
- **gRPC**: new optional field on `GitSource` in `proto/run.proto`. `run/stream-handler.ts` and `jobs/executor.ts` already forward the Git source, so they do not change.
- **Ansible service**: `models.py`, `materialize.py`, `play_targets.py` and `grpc/services/runner.py`.
- **Frontend**: `repository-form-modal.tsx` and the `playbooks` locales.
- **Docs**: the `vault-no` rule, `docs/docs/ejecucion/`, `docs/docs/guias/`, the `write-playbook` served skill, `apps/site` docs in both languages and `AGENTS.md`.
