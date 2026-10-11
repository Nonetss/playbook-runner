## 0. Preconditions

- [ ] 0.1 Confirm the in-progress `add-endpoint-and-frontend-tests` change is committed (its `packages/api/tests/v1/jobs/live.test.ts` is the base this change extends); verify with `git status` that `live.test.ts` is tracked before editing it

## 1. Dependencies

- [ ] 1.1 In the root `package.json` catalog, pin every `@orpc/*` entry (`server`, `openapi`, `zod`, `client`, `tanstack-query`) to exact `1.15.5` and add `"@orpc/experimental-publisher": "1.15.5"`; add `"@orpc/experimental-publisher": "catalog:"` to `packages/api/package.json`; run `bun install` and verify `bun.lock` resolves a single `@orpc/shared@1.15.5` (no 1.15.4 copies) and installs neither `ioredis` nor `@upstash/redis`
- [ ] 1.2 Verify the bump alone is safe: `bun run check-types` and `bun run test` pass before any code change

## 2. Publisher module

- [ ] 2.1 Create `packages/api/src/v1/jobs/events.ts`: `MemoryPublisher<{ [channel: \`run:${string}\`]: RunMessage }>` with `RunMessage = { event: RunEventRecord } | { end: LiveRunResult }`, state on `globalThis.__jobEvents` (created once, reused across `bun --hot`), `publishRunMessage(runId, message)` and `subscribeRunMessages(runId, signal?)` passing `maxBufferedEvents: Number.POSITIVE_INFINITY`; verify with `bun run --filter @playbook-runner/api check-types`

## 3. Run registry

- [ ] 3.1 Rewrite `packages/api/src/v1/jobs/live.ts` on top of `events.ts`: keep `beginLiveRun`, `publishRunEvent`, `finishLiveRun` and the 30 s post-finish retention; move the registry map to `globalThis`; drop `EventPublisher`, `RunFrame` and `nextSeq`. `watchLiveRun(runId, signal?)` subscribes synchronously, copies `events`/`done` right after with no `await` in between, yields the replay, then live messages until `{ end }`; on abort (`signal.aborted`) it returns normally, and `finally` awaits `live.return()`. Verify `executor.ts` compiles unchanged (`check-types`)
- [ ] 3.2 Extend `packages/api/tests/v1/jobs/live.test.ts` and verify `bun run --filter @playbook-runner/api test` passes with: (a) 500 events published before the watcher reads any are all received in order (no drop); (b) an event published between creating the watcher and its first `next()` arrives exactly once; (c) two watchers of one run each get the full sequence and result; (d) aborting one watcher's signal while the run is silent ends that watcher promptly without a further event, and the other watcher still gets the rest and the result; (e) the existing late-attach, after-finish, unknown-run and TTL cases still pass

## 4. Watch procedure

- [ ] 4.1 `packages/api/src/v1/jobs/handler.ts`: `jobRunsHandler.watch` takes `{ context, input, signal }` (`signal?: AbortSignal`) and returns `watchLiveRun(input.runId, signal)`; `jobs/router.ts` forwards `signal` from the handler options. Verify `check-types` and that `/openapi.json`'s `jobs.runs.watch` schema is unchanged (contract untouched)
- [ ] 4.2 Update the "Backend API layering" handler rule in `AGENTS.md` to allow an optional `signal?: AbortSignal` on streaming (event-iterator) handlers, forwarded from the router; verify by reading the updated paragraph

## 5. Frontend reattach

- [ ] 5.1 Add `apps/frontend/src/features/jobs/lib/run-watch-retry.ts` with `isTransportError(err)` (true for non-`ORPCError`s and for `ORPCError` codes `BAD_GATEWAY`/`SERVICE_UNAVAILABLE`/`GATEWAY_TIMEOUT`), `reattachDelay(attempt)` (1, 2, 4, 8, 8 s) and `MAX_REATTACH_ATTEMPTS = 5`; cover them in `apps/frontend/tests/unit/features/jobs/lib/run-watch-retry.test.ts` and verify `bun run --filter frontend test` passes
- [ ] 5.2 Update `useJobRunWatch` in `features/jobs/hooks/use-jobs.ts`: on a transport error while `phase === "running"`, schedule a reattach with `reattachDelay`, expose `reconnecting: boolean`, skip the first `shownCount` events of each new attempt, reset the attempt counter once an attempt delivers an event, clear pending timers in `detach` (respecting the generation guard), and go to `"error"` for non-transport errors or when attempts run out; a `null` result still settles to `"idle"`. Verify with `astro check` (`bun run check-types`)
- [ ] 5.3 Show the reconnecting hint in the job run console (`job-detail-page.tsx` → `RunStreamStatus` labels or a banner) with new copy `detail.reconnecting` in `locales/en/jobs.json` and `locales/es/jobs.json`, using design-system tokens only; verify in the running app that the hint appears while the backend is unreachable and clears after reattaching

## 6. Verification

- [ ] 6.1 Run `bunx biome ci .`, `bun run check-types` and `bun run test`; all pass
- [ ] 6.2 Manual check with the dev stack: start a long, verbose job run, open it in two tabs, close one (the other keeps streaming and the run finishes normally); in one tab, interrupt the connection (stop the gateway/backend proxy briefly or go offline in DevTools) and confirm the console shows the reconnecting hint, reattaches, and shows every event once until the result
- [ ] 6.3 Run the job-related Playwright E2E specs (`bun run test:e2e`) and verify they pass unchanged
