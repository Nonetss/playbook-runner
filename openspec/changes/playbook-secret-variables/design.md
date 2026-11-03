## Context

See `proposal.md` for motivation and the specs for requirements. This change builds on `add-infisical-integration`, which must be archived first: `specs/infisical-secrets` is a delta against the spec that archive creates.

Today a run with a connection receives `INFISICAL_*` variables and playbooks call the collection's lookup. The runner already has `infisicalsdk`, masks strings through `redact` on `AnsibleRunnerConfig` and silences `ansible-runner`'s raw display with `quiet`.

Facts checked before writing this design:

- **Passing values literally (`ansible-core` 2.21.1, `ansible-runner` 2.4.3):** a plain extra var containing `{% raw %}` fails the run with a template syntax error. A YAML file with `!unsafe` values passed as `-e @file` delivers the exact text, including quotes and newlines, to `debug` and `template`.
- **Precedence:** with the same name in both, the value from the `extravars` argument beat that file. Hence the collision requirement.
- **SDK (`infisicalsdk` 1.1.0):** `list_secrets` has `view_secret_value`, and secrets carry `secretValueHidden`. `InfisicalRequests` calls `requests` with **no timeout**. Clients cache for 60 s by default.
- **The user's instance (`secrets.iota.es`), with a machine identity (task 1.1):** `GET /api/v1/workspace/<id>` answers 200 with `workspace.environments[]` of `{ id, name, slug }`; `/api/v1/projects/<id>` and `/api/v2/workspace/<id>` answer 404. `list_secrets(view_secret_value=False)` returns the names with `secretValueHidden: true` and the value replaced by the placeholder `<hidden-by-infisical>`, not the real value; a normal list returns `secretValueHidden: false`. The placeholder is a non-empty string, so a fetch must check `secretValueHidden` and never treat a non-empty value as readable.

## Goals / Non-Goals

**Goals:**

- A playbook's YAML uses plain variables, with no Infisical syntax.
- Values stay in the runner: not in the backend, the database or the browser.
- A run never starts with a missing secret.

**Non-Goals:**

- A security boundary between users: anyone who can edit a playbook can print what its connection allows. Least privilege in Infisical stays the control.
- Masking transformed values.
- Caching values between runs.

## Decisions

### The runner fetches values, not the backend or a generated lookup

Three options were considered:

- **Backend fetches and sends values:** values would cross gRPC and live in backend memory, and the backend would need outbound access to a user-supplied URL.
- **Runner generates lookup expressions as extra vars:** values stay out of the runner, but Ansible templates lazily, so each reference repeats login and fetch per host and task, and the runner could not mask anything.
- **Runner fetches once before Ansible (chosen):** one fetch per run, failure before anything executes, and known values can be masked. Values live in a temporary file for the run.

### Deliver through an owner-only `-e @file` with `!unsafe`

`materialize` writes `secret-vars.yml` (mode `0600`) inside the run directory, so the existing `cleanup` removes it on success, failure and cancel. `AnsibleRunnerConfig` gains `cmdline`. The run directory contains a sanitized but user-derived label, so the argument is built with `shlex.quote`, because `ansible-runner` splits `cmdline` with `shlex`. Each value is written with PyYAML as a double-quoted `!unsafe` scalar, because JSON leaves characters such as `\x7f` unescaped and YAML rejects them.

### One connection and one environment per playbook

Each playbook stores `infisical_connection_id` (`onDelete: restrict`) and `infisical_environment`; the new table `playbook_secret_variables` holds `playbook_id` (`onDelete: cascade`), `variable_name`, `secret_name` and `secret_path`, unique on `(playbook_id, variable_name)`. This departs from the earlier sketch with a connection column on each row: a per-run environment override only makes sense when every variable shares one project, because slugs differ between projects, and it simplifies the form.

`jobs` gains `infisical_environment` and loses `infisical_connection_id`. `infisical_connections` gains `project_id`, nullable in the database so existing rows survive the migration and required by the API. A connection without one fails at run time with `ResolveRunPreconditionError`.

### Run and job variables

The run page and job form also choose secrets, so the effective set of a run is built in `resolveRun`:

- **Connection:** the run's or job's, else the playbook's.
- **Environment:** the run's or job's, else the playbook's. A slug belongs to a project, so a run that changes connection and keeps the playbook's slug fails on the first missing secret, naming the variable.
- **Variables:** the playbook's, plus the run's or job's, and an entry with the same name replaces the playbook's secret.

Inputs gain `secretVariables` next to the existing `extravars`, and the two stay separate on the wire, so a secret reference can never be sent as literal text. The new table `job_secret_variables` mirrors the playbook table with `job_id` (`onDelete: cascade`) and stores only the job's own entries, so the playbook's later changes still reach the job. An interactive run's entries are never stored.

Declared rows cannot be removed at run time, because the playbook relies on them. A job's stored override whose name the playbook no longer declares simply remains an added variable.

### Declaration behind its own procedures

`v1.playbooks.secretVariables.get/set`, not part of `playbooks.update`, because `update` is `FORBIDDEN` for Git playbooks and a sync must never touch the declaration. `set` replaces the whole declaration in a transaction. The sync upserts by `(repository_id, path)`, so ids and declarations survive; a declaration on a playbook whose file vanished simply stays until it is deleted.

### Proto

```proto
message SecretVariable {
  string name = 1;
  string secret_name = 2;
  string secret_path = 3;
}
message SecretVariables {
  InfisicalAuth auth = 1;
  string project_id = 2;
  string environment = 3;
  repeated SecretVariable variables = 4;
}
// RunBundleRequest
reserved 5;
optional SecretVariables secret_variables = 6;
```

Field 5 is reserved rather than reused, because the old message is a different shape.

### Fetch step in the runner

`app/services/ansible/infisical.py` replaces `infisical_envvars`. In `_run_bundle`, after the reserved extra vars check and next to the Git `ensure_commit`, it logs in once and calls `list_secrets` once per distinct path, with `cache_ttl=None`. This runs in a thread under `asyncio.wait_for` with `INFISICAL_TIMEOUT_S` (default 15). Because the SDK sets no timeout, a `requests` adapter with a default timeout is mounted on `client.api.session`, so a hung call cannot leak a thread. Failures become a `RunBundleResponse(error=...)` frame, like Git errors. The message is built from the variable name and the error class or HTTP status, never from `str(exc)` on responses that could echo data. A secret with `secretValueHidden` counts as unreadable. The runner re-checks extra var collisions, since jobs store extra vars independently.

Masking reuses `redact`, plus the client secret, filtered to values of at least 4 characters. A 1-character secret masked everywhere would make output unreadable, and it offers little real protection.

### Pickers go through the runner

New RPCs `ListInfisicalEnvironments` and `ListInfisicalSecretNames`, wrapped by `v1.infisicalConnections.environments` and `.secretNames`. Using the runner keeps a single network path to Infisical, the one runs depend on, keeps the backend without outbound HTTP, and the gateway's `/run.*` route already covers them. The backend therefore also decrypts the client secret for these two calls, through one helper shared with `run/resolve.ts`, which widens the "only when building a run" rule in `infisical-secrets`. Secret names use `view_secret_value=False` and return only keys. Environments call `GET /api/v1/workspace/<id>` through the SDK's session and return an empty list on any failure or unexpected shape, so the form falls back to a typed slug. The environment select starts on the first listed one when nothing sets it. The picker has no path field: it lists the root of the environment, and a variable stored with another path keeps it, so choosing secrets inside folders needs a recursive listing later.

### Keeping the selector, removing the injected credentials

The user asked for secrets to be selectable on the run page, so `infisicalConnectionId`, the job column and the select stay, and the earlier plan to remove them was dropped. `infisical_envvars` still goes: credentials stay out of the Ansible environment, where every task of a playbook could read them. Selecting a connection therefore no longer helps a hand-written `lookup`. The collection stays in the image: it still works for anyone passing credentials explicitly, and removing it would break those playbooks for no benefit.

## Risks / Trade-offs

- **[The workspace route may differ on other Infisical versions]** → Verified only on the user's instance. The environment list degrades to text.
- **[Secret on disk during the run]** → Same lifetime and permissions as SSH keys, covered by a test. All runs share one UID, so a concurrent playbook with local tasks could read it, as it can SSH keys today.
- **[A renamed or deleted secret in Infisical]** → The run fails before Ansible starts, naming the variable.
- **[Short values are not masked]** → Stated in the spec; values under 4 characters are rarely real secrets.
- **[Each run depends on Infisical being up]** → Intended: no stale secrets. Scheduled jobs fail visibly.
- **[A user at the run page can read any secret the connection allows]** → Already true for anyone able to edit a playbook; the guide keeps asking for least-privilege identities.
- **[The run page lists secrets per selection]** → Picker queries share the TanStack cache by connection, environment and path, and listing failures never block typed values.
- **[Existing playbooks using injected `INFISICAL_*` lookups stop authenticating]** → The feature is unreleased; the guide documents the replacement.

## Migration Plan

1. Finish and archive `add-infisical-integration`.
2. Apply the schema change; the user generates and applies the migration. It only adds tables and columns, so jobs keep their connection.
3. Edit existing connections to add the project id.
4. Deploy backend and runner together.

Rollback: redeploy the previous images; the added tables and columns can stay or be reverted by hand. Secrets in Infisical are unaffected.
