## Why

A person who starts a playbook by hand cannot reliably stop it. A job's "run now" keeps going until Ansible finishes, and on the playbook run page the only control is "Stop watching", which says the run may still be active even though closing the stream is meant to stop it. A wrong playbook against the wrong hosts has to run to completion, or until the tab is closed and the user hopes for the best.

## What Changes

- The playbook run page gets a "Cancel run" action with a confirmation, replacing "Stop watching". Its copy states what cancelling means: Ansible stops, nothing is rolled back, and a command already launched on a host may keep running there.
- Execution streams stop as soon as the caller leaves, including during a silent task. From reading the code, a stream's early close appears to take effect only when the next task event arrives, because heartbeats are dropped without yielding, so a long silent task would not be interrupted until it produces output (to be reproduced first, see tasks). This fixes playbook, command, script and ping streams alike, as the existing cancellation requirement already promises.
- New procedure `v1.jobs.runs.cancel` cancels a job run started by hand (`trigger = 'manual'`). Runs started by the schedule are refused with `FORBIDDEN`, and a run that is not in progress with `CONFLICT`.
- The job detail page gets a "Cancel run" action for a selected manual run in progress, with a confirmation and a "Cancelling…" state until the run settles. "Stop watching" stays there, because leaving a job's console does not stop the job.
- New terminal run status `cancelled`, stored in `job_runs` and exposed by the run feed, the live watch and the run-change stream. It has its own label and neutral tone, records who cancelled it, and does not count as a failure or lower success rates.
- **BREAKING** (API consumers): the `status` of job runs, rollups, watch results and run changes gains the value `cancelled`.
- **Database**: the `job_run_status` enum gains `cancelled`. The schema edit is part of this change; generating and applying the migration remains the user's step, and it must be applied before the new backend runs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `run-lifecycle`: stream cancellation takes effect during silent tasks; adds the manual job run cancellation contract and how a cancelled run finalizes.
- `job-run-history`: the feed, metrics and run-change stream gain the `cancelled` status, which is not a failure.
- `run-console-presentation`: the playbook run page and the job detail page offer a confirmed cancel action with honest copy.

## Impact

- **API**: `packages/api/src/v1/jobs/` (`router`, `handler`, `input`, `output`, `executor`, `live`, `events`), `packages/api/src/v1/run/` (`router`, `stream-handler`).
- **gRPC helper**: `packages/grpc/src/client.ts` (`serverStream` takes a `signal`). No proto change and no change to the Ansible service, which already stops and cleans up a cancelled call.
- **Database**: `packages/db/src/schema/jobs.ts` (enum value), plus a migration the user generates.
- **Frontend**: `features/jobs` (types, hooks, `job-detail-page`, `run-widgets`), `features/playbooks/components/run-playbook-page.tsx`, `features/run` (`use-run-stream` comment, status components), `es`/`en` locales.
- **Docs**: `docs/` (known problem `job-sin-cancelacion`, `plataforma/backend.mdx`, `fundamentos/panorama.mdx`), `apps/site` first-run and architecture pages in both languages, `AGENTS.md`.
- **Out of scope**: cancelling scheduled runs, a cancel button on commands, scripts and ping (they do get the faster stream stop), rolling back hosts, and stopping commands already launched on a remote host.
