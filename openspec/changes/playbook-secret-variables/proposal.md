## Why

Reading an Infisical secret today means writing a long `lookup(...)` expression with a project id, environment and path in every playbook, and remembering to pick a connection before each run. Forgetting it fails with a confusing authentication error. The run page and job form accept only typed values, so a secret cannot be chosen there at all. Secrets a playbook prints also reach the run history in plaintext, because the runner never sees their values and cannot mask them.

Operators should declare which secrets a playbook needs in its edit page, choose further ones from a select when running it or saving a job, and use them all as plain variables.

## What Changes

- A playbook can declare **secret variables**: one Infisical connection, a default environment, and a list of `variable name → secret` rows chosen from a picker. This also works for read-only Git playbooks, because the declaration lives in the database, not in the file.
- Before starting Ansible, the runner fetches the declared secrets and passes them as variables that Ansible never evaluates as templates. Values never reach the backend, the database or the browser through this flow.
- The runner masks those values in run events and logs.
- An interactive run or a job can choose the connection and the environment, overriding the playbook's defaults, so one playbook serves `dev` and `prod`.
- An interactive run or a job can add secret variables from the same select, or point a variable the playbook declares at another secret. On the run page and job form, each variable's value is either typed text or a chosen secret. Variables a playbook declares appear already filled in and cannot be removed there.
- A connection gains a project id: one connection per Infisical project.
- New procedures list a connection's environments and secret names through the runner, for the pickers. They never return values.
- **BREAKING** (for the not yet released `add-infisical-integration`): the `INFISICAL_*` variables are removed. The connection select on the run page and job form stays, but it now selects where secret variables are read from, and hand-written `lookup` calls no longer receive credentials automatically.

Out of scope: per-variable connections or environments, dynamic secrets, secret variables on scripts and commands, and creating or editing secrets from Playbook Runner.

## Capabilities

### New Capabilities

- `playbook-secret-variables`: Declaring secret variables on a playbook, adding or overriding them per run or job, choosing the connection and environment per run or job, fetching and delivering the values, masking them, and the pickers that list environments and secret names.

### Modified Capabilities

- `infisical-secrets`: Connections gain a project id; the client secret is also decrypted to list environments and secret names; deleting a connection is refused while a playbook or a job uses it; a run's connection becomes an override of the playbook's; runs stop receiving `INFISICAL_*` variables; masking and operator guidance change to match. This capability is created when `add-infisical-integration` is archived, which must happen first.

## Impact

- **Database**: new `playbook_secret_variables` and `job_secret_variables` tables; new columns on `infisical_connections`, `playbooks` and `jobs`. `jobs.infisical_connection_id` stays. **Requires a migration, generated and applied by the user.**
- **API**: new `v1.playbooks.secretVariables.get/set`, `v1.infisicalConnections.environments/secretNames`; `infisicalEnvironment` and `secretVariables` on `v1.run.run` and job input and output; `infisicalConnectionId` kept.
- **gRPC**: `RunBundleRequest.infisical` replaced by a secret-variables message; two new `RunnerService` RPCs.
- **Runner**: fetches secrets with `infisicalsdk`, writes an owner-only variables file in the run directory, new `INFISICAL_TIMEOUT_S` setting.
- **Frontend**: new section on the playbook edit page, environment select and a text-or-secret value on each variable of the run page and job form, project field on the connection form.
- **Docs**: Infisical guide in both languages, `AGENTS.md`.
