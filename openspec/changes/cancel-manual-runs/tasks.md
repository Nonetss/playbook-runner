## 1. Database (schema edit by the agent, migration by the user)

- [x] 1.1 Add `cancelled` to `jobRunStatusEnum` in `packages/db/src/schema/jobs.ts`, and to the row factories in `packages/db/testing/rows.ts` if they enumerate statuses; verify `bun run check-types` shows only the type errors the next groups resolve
- [x] 1.2 **USER, the agent stops here and asks:** generate and apply the migration for the new enum value. The agent never runs `db:generate`, `db:push` or `db:migrate`, and never touches `packages/db/src/migrations/`. Unit tests need no database, so groups 2 to 6 can proceed meanwhile; group 7 cannot. Verified when the user confirms it is applied

## 2. Immediate stream stop

- [x] 2.1 Reproduce the suspected delay first: add a test to `packages/api/tests/v1/run/stream-handler.test.ts` with a `controlledStream` that only sends heartbeats and closes the consumer, and record the result. If `.return()` does not stay queued, update `design.md` and tell the user before continuing; the `signal` work remains useful for jobs
- [x] 2.2 Add `signal?: AbortSignal` to `serverStream` in `packages/grpc/src/client.ts`: do not open the call if already aborted, call `stream.cancel()` on abort, remove the listener in `finally`; verify `bun run check-types`
- [x] 2.3 Forward oRPC's `signal` through `run/router.ts` and the four `streamHandler` methods to `serverStream`, and make `interactive()` rethrow without mapping when the signal is aborted; verify with `stream-handler.test.ts` tests that each kind passes the signal to `grpc.serverStream` and that a `CANCELLED` failure after an abort is not `BAD_GATEWAY`, while one without an abort still is

## 3. Job run cancellation (API)

- [x] 3.1 Extend `jobs/live.ts`: `LiveRun` with an `AbortController` and `cancelledBy`, `beginLiveRun` returning the signal, `cancelLiveRun(runId, userName)`, and `cancelled` in `LiveRunResult`; verify in `tests/v1/jobs/live.test.ts` an abort, the first canceller kept on a repeat, `false` for an unknown or finished run, and that aborting does not end other watchers abnormally
- [x] 3.2 Update `jobs/executor.ts`: pass the signal to `serverStream`, set `cancelled` in `streamRun`'s `catch` before `describeStreamError`, persist status `cancelled` with the error naming the user, keep it in the minimal retry, and publish `cancelled` on `watch` and `watchChanges`; verify in `executor.test.ts`: cancelled mid-run stores the events and status, `hostsOk`/`hostsFailed` are null without a recap, a `done` frame before the abort keeps the real status, a cancellation during `resolveRun` opens no call, and a later `startJobRun` is not `conflict`
- [x] 3.3 Add `cancelled` to the status types and schemas in `jobs/events.ts`, `jobs/output.ts` (`runStatus`, watch result, change event) and `shapeRun` in `jobs/handler.ts`; verify `bun run check-types`
- [x] 3.4 Add `jobRunsInput.cancel` (`idSchema`), `jobRunsOutput.cancel`, `jobRunsHandler.cancel` and the `runs.cancel` route with summary and description; verify in `tests/v1/jobs/runs.test.ts`: `NOT_FOUND`, `FORBIDDEN` for `schedule`, `CONFLICT` for a finished run and for one with no live entry, success passing the user's name, no row written by the handler on refusal, plus `BAD_REQUEST` for a malformed id, and that `tests/v1/router.test.ts` still only allows the two public procedures
- [x] 3.5 Exclude `cancelled` from the success denominators in `jobRunsHandler.metrics` and the rollups' `ratios`, keeping `total`, with a guard for zero; verify the arithmetic in `runs.test.ts` with the spec's 3 ok, 1 failed, 1 cancelled case (0.75) and the only-cancelled case (0), extracting the calculation into a pure helper if the fake db cannot exercise it

## 4. Status in the frontend

- [x] 4.1 Add `cancelled` to `features/jobs/types.ts` and to `JobRunWatchResult`, and to `runOutcome` and `RUN_OUTCOME_TONE` (`muted`, never `partial`) in `run-widgets.tsx`; add `status.cancelled` to `es` and `en` `jobs.json`; verify `bun run check-types` and a unit test for `runOutcome` with mixed host counts
- [x] 4.2 Check `recent-run.definition.tsx`, `job.definition.tsx` and `history-page.tsx` render `cancelled` through `RunStatusTag` and the tone without a destructive class; verify by reading each and in the manual check 7.2

## 5. Playbook run console

- [x] 5.1 Make `stopWatching` in `useRunStream` and `useJobRunWatch` decide inside a functional `setPhase`, and correct the doc comment on `useRunStream`; verify in a new `tests/unit/features/run/use-run-stream.test.tsx` that stopping after the run finished keeps `done` and its result, and in `use-job-run-watch.test.ts` likewise
- [x] 5.2 In `run-playbook-page.tsx`, make the action ask for confirmation through the page's `confirm` and then call `stopWatching`; change the `run.*` strings in `es` and `en` `playbooks.json` ("Cancelar ejecución", confirmation text with the three warnings, the sent-cancellation message); verify `check-types`, that the `run_modal` keys and commands/scripts copy are untouched, and that the JSON keys match in both languages

## 6. Job detail console

- [x] 6.1 Add `useCancelJobRun` to `features/jobs/hooks/use-jobs.ts` with its error toast, including a specific message for `CONFLICT`; verify `check-types`
- [x] 6.2 Add the optional `tone` to `RunResultBanner`; verify `check-types` and that the existing callers need no change
- [x] 6.3 In `job-detail-page.tsx`, show "Cancel run" only for a selected `running` run with `trigger === "manual"`, with confirmation, `cancellingRunId` and the disabled "Cancelling…" state; use the neutral tone for the cancelled result and persisted text, with a dedicated `detail.result_cancelled` key and the strings in `es` and `en` `jobs.json`; verify `check-types` and in the manual check 7.2

## 7. End-to-end verification (needs 1.2 applied)

- [ ] 7.1 With the dev stack running through the gateway, run a playbook whose task is `command: sleep 300` (silent, so only heartbeats flow) from the run page and cancel it; verify within seconds, on the Ansible service, that no process mentions the run's `private_data_dir` and the run's scratch directory is gone. Report the outcome to the user with what was observed, including if this has to be left to them
- [ ] 7.2 Run the same playbook as a job's "run now" and cancel it; verify the row is `cancelled` with the user's name, the output so far stays visible, history, dashboard and job list show it neutrally, success metrics do not drop, "Run now" works again, and a scheduled run offers no cancel and its API call returns `FORBIDDEN`
- [ ] 7.3 Add an E2E case in `apps/frontend/tests/e2e/admin/` for the cancel action on the job detail page, following the `192.0.2.10` convention and asserting only what the suite can guarantee; verify with `bun run test:e2e`

## 8. Documentation and final checks

- [x] 8.1 Load the `colofon-documentation` skill and read `docs/AGENTS.md`, then update `docs/`: narrow the known problem `catalog/problemas/job-sin-cancelacion.yaml` to scheduled runs, and update `plataforma/backend.mdx`, `fundamentos/panorama.mdx` (the `CONFLICT` row) and the overlap risk; verify with the `colofon-check` skill
- [x] 8.2 Update `apps/site` (`first-run`, `architecture`, `es` and `en`) with the cancel action, and `AGENTS.md` (`v1.jobs.runs.cancel`, `cancelled`, the `signal` on `serverStream`); verify `bun run --filter site build`
- [x] 8.3 Run `bunx biome ci .`, `bun run check-types` and `bun run test`, and `openspec validate cancel-manual-runs --strict`; verify all pass
