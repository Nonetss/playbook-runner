import { MemoryPublisher } from "@orpc/experimental-publisher/memory"
import type { LiveRunResult } from "#v1/jobs/live"
import type { RunEventRecord } from "#v1/run/proto"

/**
 * What a run's own channel carries: each event of the run, then an end
 * marker with its terminal result.
 */
export type RunMessage = { event: RunEventRecord } | { end: LiveRunResult }

/**
 * A job run starting (`running`) or finishing (`ok`/`failed`), whatever
 * started it: ids only, for clients to refetch what they show.
 */
export type RunChange = {
  runId: string
  jobId: string
  status: "running" | "ok" | "failed"
  trigger: "manual" | "schedule"
}

/**
 * Every event the jobs feature publishes: a channel per run (`run:<runId>`),
 * so a watcher only ever hears its own run and a later run of the same job
 * never reaches an old watcher; and one jobs-wide `run-changed` channel,
 * since every authenticated user may see every job's runs.
 */
type JobEvents = {
  [channel: `run:${string}`]: RunMessage
  "run-changed": RunChange
}

type JobEventsState = {
  publisher: MemoryPublisher<JobEvents>
}

// `bun --hot` re-evaluates this module but keeps the already started job
// scheduler, whose executor closures hold the first publisher. Keeping the
// state on globalThis stops the scheduler and new watchers from ending up on
// different publishers.
declare global {
  var __jobEvents: JobEventsState | undefined
}

function createState(): JobEventsState {
  const existing = globalThis.__jobEvents
  if (existing) return existing
  const created: JobEventsState = {
    // In memory: a job run lives in the process that started it, as the job
    // scheduler and the gRPC client cache already assume.
    publisher: new MemoryPublisher<JobEvents>(),
  }
  globalThis.__jobEvents = created
  return created
}

const state = createState()

/** Published by the live-run registry for each event of a run and its end. */
export function publishRunMessage(runId: string, message: RunMessage): void {
  void state.publisher.publish(`run:${runId}`, message)
}

/**
 * A run's messages from the moment of the call. The listener is registered
 * synchronously, which is what lets `watchLiveRun` copy the run's buffer
 * right after without missing or repeating an event. A watcher slower than
 * the run must not lose any, so nothing is dropped. The iterator throws the
 * abort reason once `signal` aborts.
 */
export function subscribeRunMessages(runId: string, signal?: AbortSignal) {
  return state.publisher.subscribe(`run:${runId}`, {
    signal,
    maxBufferedEvents: Number.POSITIVE_INFINITY,
  })
}

/** Published by the job executor when a run opens and when it finishes. */
export function publishRunChange(change: RunChange): void {
  void state.publisher.publish("run-changed", change)
}

/**
 * Every run change from the moment of the call, registered synchronously and
 * never dropped. The iterator throws the abort reason once `signal` aborts.
 */
export function subscribeRunChanges(signal?: AbortSignal) {
  return state.publisher.subscribe("run-changed", {
    signal,
    maxBufferedEvents: Number.POSITIVE_INFINITY,
  })
}
