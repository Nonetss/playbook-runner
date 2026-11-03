## Why

Playbooks need secrets (database passwords, API tokens) at run time, and today the only places to put them are the playbook itself or extra vars, which are stored in plaintext in `jobs.extravars_json` and returned by the API. Infisical's `infisical.vault` Ansible collection solves the retrieval side, but it needs a machine identity credential, and that credential has nowhere safe to live: a process-wide variable on the runner reaches every playbook of every user.

## What Changes

- The runner image ships a pinned `infisical.vault` collection and the `infisicalsdk` Python package, so playbooks can use it with no per-run installation.
- New **Infisical connections** resource: a name, an Infisical URL and a Universal Auth client id and secret. The secret is encrypted at rest and never returned by the API. Any authenticated operator manages connections, the same trust level as SSH credentials.
- A job, or an interactive playbook run, can optionally reference one connection. Only those runs receive its credentials, as `INFISICAL_*` environment variables the collection's lookup plugins read. Runs without a connection, commands, scripts and pings receive nothing.
- The runner masks the connection's client secret in run events and service logs.
- New management page under the Ansible section, a connection picker on the job form and the run page, and a guide in the project website covering usage and limits (`no_log`, lookups versus modules).
- A connection referenced by a job cannot be deleted.

Out of scope: other Infisical auth methods, other secret managers, fetching secrets from the backend, per-user access to connections, and removing `SERVICE_TOKEN` from the runner's environment (existing issue, to be handled separately).

## Capabilities

### New Capabilities

- `infisical-secrets`: Managing Infisical connections, attaching them to jobs and interactive runs, delivering their credentials to the runner, masking them, and shipping the collection in the runner image.

### Modified Capabilities

None. Existing requirements keep their meaning; everything this change adds is optional and lives in the new capability.

## Impact

- **Database**: new `infisical_connections` table and nullable `jobs.infisical_connection_id`. **Requires a migration, generated and applied by the user.**
- **API**: new `v1.infisicalConnections.*` procedures; `v1.run.run` and `v1.jobs.create/update` accept an optional connection id; job output includes it. Additive, no breaking changes.
- **gRPC**: optional `InfisicalAuth` field on `RunBundleRequest` (`proto/run.proto`).
- **Runner**: `apps/ansible` run path and event handling, `pyproject.toml`/`uv.lock`, `Dockerfile` and `Dockerfile.dev` (image build now downloads from Ansible Galaxy).
- **Frontend**: new `features/infisical`, new surface in `app-surfaces.ts`, job form, run page, search sources, en/es locales.
- **Docs**: `apps/site` guide in both languages, `AGENTS.md`, `apps/ansible/README.md`.
- **Network**: the runner container needs outbound access to the Infisical instance.
