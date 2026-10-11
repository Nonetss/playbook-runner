import { publishRunMessage, subscribeRunMessages } from "#v1/jobs/events"
import type { RunEventRecord } from "#v1/run/proto"

export type LiveRunResult = {
  runId: string
  status: "ok" | "failed"
  ok: boolean
}

type LiveRun = {
  /** Every event of the run so far, replayed to whoever attaches later. */
  events: RunEventRecord[]
  done: LiveRunResult | null
}

/**
 * In-memory registry of currently-executing job runs, regardless of what
 * triggered them (cron, another browser tab's "run now", this one) — a
 * single backend process, matching how the job scheduler and the gRPC
 * client cache already assume in-process state. Lets any caller "attach" to
 * a run's live events at any point during (or slightly after) its
 * execution via `watchLiveRun`, catching up on whatever already happened
 * before subscribing and then streaming the rest as it arrives. Delivery to
 * watchers goes through the jobs publisher (`#v1/jobs/events`); this
 * registry only keeps what a late watcher needs to catch up.
 *
 * Entries are dropped a short while after the run finishes — from then on
 * the persisted `job_runs` row (already written by the time `finishLiveRun`
 * is called) is the only source of truth.
 */
type LiveRunsState = {
  runs: Map<string, LiveRun>
}

// `bun --hot` re-evaluates this module while the job scheduler started before
// the reload keeps running; keeping the registry on globalThis stops new
// watchers from losing sight of its runs.
declare global {
  var __liveJobRuns: LiveRunsState | undefined
}

function createState(): LiveRunsState {
  const existing = globalThis.__liveJobRuns
  if (existing) return existing
  const created: LiveRunsState = { runs: new Map() }
  globalThis.__liveJobRuns = created
  return created
}

const state = createState()

/** Keep a just-finished run watchable for a bit, in case a subscriber races the finish. */
const FINISHED_RUN_TTL_MS = 30_000

export function beginLiveRun(runId: string): void {
  state.runs.set(runId, { events: [], done: null })
}

export function publishRunEvent(runId: string, data: RunEventRecord): void {
  const run = state.runs.get(runId)
  if (!run) return
  run.events.push(data)
  publishRunMessage(runId, { event: data })
}

export function finishLiveRun(runId: string, result: LiveRunResult): void {
  const run = state.runs.get(runId)
  if (!run) return
  run.done = result
  publishRunMessage(runId, { end: result })
  setTimeout(() => {
    if (state.runs.get(runId) === run) state.runs.delete(runId)
  }, FINISHED_RUN_TTL_MS)
}

/**
 * Watches a run's live events: replays whatever this registry already
 * captured, then streams new ones until the run finishes. Yields
 * `RunEventRecord`s and returns the terminal result — or `null` immediately
 * if the run isn't (or is no longer) live, so the caller can fall back to
 * the persisted row instead.
 *
 * Every event is delivered once: the publisher registers the live listener
 * synchronously and the buffer is copied right after, with no `await` in
 * between, so each event is either in the copy or queued live, never both.
 * Aborting `signal` only ends this watcher, at once, and never the run.
 */
export async function* watchLiveRun(
  runId: string,
  signal?: AbortSignal
): AsyncGenerator<RunEventRecord, LiveRunResult | null, void> {
  const run = state.runs.get(runId)
  if (!run || signal?.aborted) return null

  const live = subscribeRunMessages(runId, signal)
  const replay = run.events.slice()
  // A run that had already finished published its end marker before this
  // listener existed; its replay is the whole run.
  const doneBefore = run.done
  try {
    for (const data of replay) yield data
    if (doneBefore) return doneBefore

    for await (const message of live) {
      if ("end" in message) return message.end
      yield message.event
    }
    return null
  } catch (error) {
    // The subscription throws the abort reason: a watcher that left ends its
    // stream normally, not as a failure.
    if (signal?.aborted) return null
    throw error
  } finally {
    await live.return()
  }
}
