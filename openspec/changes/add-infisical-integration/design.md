## Context

See `proposal.md` for motivation and `specs/infisical-secrets/spec.md` for requirements.

The backend resolves a run from the database (`run/resolve.ts`, used by the interactive stream handler and the job executor) and sends it over `RunBundle`. The runner materializes a scratch directory, runs `ansible_runner.run` with an `envvars` map and deletes the directory afterwards. Events are reduced by `event_payload`, stored in `job_runs.events_json` and pushed live.

A feasibility test ran the collection through `ansible-runner` against a fake local Infisical (`ansible-core` 2.21.1, `infisical.vault` 1.2.3, `infisicalsdk` 1.1.0) and found:

- Lookups read `INFISICAL_*` from the environment and work with an empty `ANSIBLE_CONFIG`. No module or `module_utils` file reads the environment, despite what Infisical's documentation says of `login`.
- Modules run on the target host and fail there without the SDK. They work with `delegate_to: localhost`, where the venv interpreter has it.
- Printed secrets reach the `msg` of the event; `no_log: true` empties it; `register` alone leaks nothing because `event_payload` drops those fields.
- Playbooks read the runner's environment through `lookup('env', ...)`.

## Goals / Non-Goals

**Goals:**

- Store the credential encrypted and deliver it only to runs that ask for it.
- Keep the change additive: nothing changes for runs without a connection.
- Reuse existing patterns (feature layering, `encryptSecret`, `resolveRun`, `EntityCardGrid`, `FormDialog`).

**Non-Goals:**

- A security boundary between playbook authors (see Risks).
- Validating credentials against Infisical from the backend. That would add an outbound HTTP path to a user-supplied URL; a failed lookup in a run already reports the problem.
- Masking the secrets a playbook fetches. The runner never sees those values.

## Decisions

### Inject environment variables, keep the collection doing the fetching

The backend passes credentials; Ansible's lookups fetch secrets. Resolving secrets in the backend and passing them as extra vars was rejected: every secret value would cross gRPC, the backend would need an Infisical client, and dynamic secrets and the collection's other features would be lost.

### A typed proto message, not a generic environment map

```proto
message InfisicalAuth {
  string url = 1;
  string client_id = 2;
  string client_secret = 3;
}
// RunBundleRequest
optional InfisicalAuth infisical = 5;
```

The runner maps it to the four `INFISICAL_*` variables in one small module (`app/services/ansible/infisical.py`). A generic `map<string,string>` would need an allowlist to stop `ANSIBLE_*` overrides, and the runner would have to guess which value to mask. The typed message rules out both.

### Mask in `AnsibleRunner.stream`, before any handler

`AnsibleRunnerConfig` gains `redact: list[str]`. When non-empty, the stream's internal `handler` deep-replaces those strings in the event before calling `log_event_handler` and queueing it. One point covers both logs and gRPC frames, including `log_event_handler`'s `[FAILED]` message. With an empty list the path is unchanged. A run with a connection also sets `quiet` on `ansible-runner`, whose raw display on the process stdout would otherwise bypass this masking (and print fetched secrets to the container logs); runs without one keep that display.

### Data model

`infisical_connections`: `id`, `name`, `url`, `client_id`, `client_secret` (ciphertext from `encryptSecret`), `created_at`, `updated_at`.

`jobs.infisical_connection_id`: nullable FK with `onDelete: "restrict"`. Other FKs in the schema use `set null`, but here that would leave a scheduled job running without credentials and failing at the lookup, far from the action that caused it. The handler checks for referencing jobs first and throws `CONFLICT`; the FK covers the race.

`job_runs` is not changed: which connection a past run used is not recorded. Recording it can be added later without affecting this design.

### API

New feature `packages/api/src/v1/infisical-connections/`, mounted as `infisicalConnections`, with the four standard files and `publicColumns` as in `credentials/handler.ts`, so the ciphertext never reaches the router. `resolveRun` gains an optional connection id and returns `infisical` in the bundle, reusing `ResolveRunNotFoundError`. The stream handler and `jobs/executor.ts` forward `bundle.infisical`, so both paths share one implementation.

### Same trust level as SSH credentials

Any non-pending user manages and uses any connection, matching `ssh-credential-management` ("any authenticated operator"). Roles for connections would be misleading while the same users can run arbitrary playbooks on the shared runner.

### Collection installed at image build

Both Dockerfiles run `ansible-galaxy collection install infisical.vault:1.2.3 -p /usr/share/ansible/collections` as root, after the venv exists and before `USER app`. That path is in Ansible's default search path, so it survives the empty `ANSIBLE_CONFIG` of Git runs, and it stays outside the venv. Installing per run from a `requirements.yml` was rejected: it would add network and time to every run, and inline playbooks have no project directory to hold one.

### Frontend placement

New surface `infisical` at `/ansible/infisical`, last entry of the `ansible` section: only playbooks and jobs consume connections, unlike SSH credentials, which belong to devices. New `features/infisical` mirrors `features/credentials` (`definitions/`, `hooks/`, `FormDialog`). A shared connection select lives in the feature and is used by the job form and the run page, with "none" as default. Connections are also added to `surface-search-sources.ts`.

## Risks / Trade-offs

- **[A playbook can read credentials it was given]** `lookup('env', ...)` or a transformed print defeats masking. → Inherent to giving a playbook credentials. Least-privilege identities in Infisical are the real control, and the page and guide say so.
- **[Not hard isolation between concurrent runs]** All runs share one UID, so a playbook with local tasks could read another live run's `env/envvars` or `/proc/<pid>/environ`, as it already can with SSH key files in `RUN_SCRATCH_DIR`. → Accepted and documented; the same operator trust level applies. Real isolation would need per-run sandboxing, a separate change.
- **[Secret on disk during the run]** `ansible-runner` writes `envvars` into `env/envvars` in the private data dir. → Same lifetime as SSH keys; `cleanup` removes it on success, failure and cancel, and a test asserts the removal.
- **[Operator sets `INFISICAL_*` on the runner process]** `ansible-runner` inherits the process environment, so those would reach every run. → The guide says not to; connections are the supported path.
- **[Secrets printed by playbooks stay in `job_runs.events_json`]** → Cannot be masked by the runner. The guidance requires `no_log`.
- **[Image build depends on Ansible Galaxy]** An outage fails the build. → Version pinned; the install step sits in its own cached layer.
- **[Upstream collection changes]** → Pinned; bumping it is a deliberate one-line change in both Dockerfiles.

## Migration Plan

1. Apply the schema change; the user generates and applies the migration. Both additions are safe on existing rows.
2. Deploy the backend and runner together. Old runners ignore the unknown proto field, so a run with a connection would fail at its lookup until the runner is updated; runs without one are unaffected.

Rollback: redeploy the previous images. The new table and nullable column are harmless to old code. Secrets in Infisical are unaffected.
