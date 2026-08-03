import { EventPublisher } from "@orpc/server"
import type { RunEventRecord } from "#v1/run/proto"

export type LiveRunResult = {
  runId: string
  status: "ok" | "failed"
  ok: boolean
}

type RunFrame =
  | { kind: "event"; seq: number; data: RunEventRecord }
  | { kind: "done"; seq: number; result: LiveRunResult }

type LiveRun = {
  events: { seq: number; data: RunEventRecord }[]
  done: LiveRunResult | null
  publisher: EventPublisher<{ frame: RunFrame }>
  nextSeq: number
}

/**
 * In-memory registry of currently-executing job runs, regardless of what
 * triggered them (cron, another browser tab's "run now", this one) — a
 * single backend process, matching how the job scheduler and the gRPC
 * client cache already assume in-process state. Lets any caller "attach" to
 * a run's live events at any point during (or slightly after) its
 * execution via `watchLiveRun`, catching up on whatever already happened
 * before subscribing and then streaming the rest as it arrives.
 *
 * Entries are dropped a short while after the run finishes — from then on
 * the persisted `job_runs` row (already written by the time `finishLiveRun`
 * is called) is the only source of truth.
 */
const liveRuns = new Map<string, LiveRun>()

/** Keep a just-finished run watchable for a bit, in case a subscriber races the finish. */
const FINISHED_RUN_TTL_MS = 30_000

export function beginLiveRun(runId: string): void {
  liveRuns.set(runId, {
    events: [],
    done: null,
    publisher: new EventPublisher(),
    nextSeq: 0,
  })
}

export function publishRunEvent(runId: string, data: RunEventRecord): void {
  const run = liveRuns.get(runId)
  if (!run) return
  const seq = run.nextSeq++
  run.events.push({ seq, data })
  run.publisher.publish("frame", { kind: "event", seq, data })
}

export function finishLiveRun(runId: string, result: LiveRunResult): void {
  const run = liveRuns.get(runId)
  if (!run) return
  const seq = run.nextSeq++
  run.done = result
  run.publisher.publish("frame", { kind: "done", seq, result })
  setTimeout(() => liveRuns.delete(runId), FINISHED_RUN_TTL_MS)
}

/**
 * Watches a run's live events: replays whatever this registry already
 * captured, then streams new ones until the run finishes. Yields
 * `RunEventRecord`s and returns the terminal result — or `null` immediately
 * if the run isn't (or is no longer) live, so the caller can fall back to
 * the persisted row instead.
 */
export async function* watchLiveRun(
  runId: string
): AsyncGenerator<RunEventRecord, LiveRunResult | null, void> {
  const run = liveRuns.get(runId)
  if (!run) return null

  let lastSeq = -1
  for (const { seq, data } of run.events) {
    yield data
    lastSeq = seq
  }
  if (run.done) return run.done

  for await (const frame of run.publisher.subscribe("frame")) {
    if (frame.seq <= lastSeq) continue // already replayed from the buffer above
    if (frame.kind === "done") return frame.result
    yield frame.data
    lastSeq = frame.seq
  }
  return null
}
