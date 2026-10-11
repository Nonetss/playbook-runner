import { afterEach, describe, expect, jest, test } from "bun:test"
import { settle } from "#tests/fixtures/grpc"
import {
  beginLiveRun,
  finishLiveRun,
  publishRunEvent,
  watchLiveRun,
} from "#v1/jobs/live"

let counter = 0
/** The registry is process-wide: every test gets a run id of its own. */
function freshRunId() {
  counter += 1
  return `live-test-run-${counter}`
}

/** Every event a watcher sees, plus the result it returns. */
async function collect(runId: string) {
  const events: unknown[] = []
  const watcher = watchLiveRun(runId)
  for (;;) {
    const next = await watcher.next()
    if (next.done) return { events, result: next.value }
    events.push(next.value)
  }
}

afterEach(() => jest.useRealTimers())

describe("watchLiveRun", () => {
  test("a run that is not live returns null at once", async () => {
    expect(await collect(freshRunId())).toEqual({ events: [], result: null })
  })

  test("a late watcher gets the backlog, then live events, until the run finishes", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    publishRunEvent(runId, { event: "first" })

    const watching = collect(runId)
    await settle()
    publishRunEvent(runId, { event: "second" })
    finishLiveRun(runId, { runId, status: "ok", ok: true })

    expect(await watching).toEqual({
      events: [{ event: "first" }, { event: "second" }],
      result: { runId, status: "ok", ok: true },
    })
  })

  test("a watcher arriving after the finish replays everything and the result", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    publishRunEvent(runId, { event: "only" })
    finishLiveRun(runId, { runId, status: "failed", ok: false })

    expect(await collect(runId)).toEqual({
      events: [{ event: "only" }],
      result: { runId, status: "failed", ok: false },
    })
  })

  test("a finished run stops being watchable after its grace period", async () => {
    jest.useFakeTimers()
    const runId = freshRunId()
    beginLiveRun(runId)
    finishLiveRun(runId, { runId, status: "ok", ok: true })

    jest.advanceTimersByTime(29_999)
    expect((await collect(runId)).result).not.toBeNull()

    jest.advanceTimersByTime(1)
    expect(await collect(runId)).toEqual({ events: [], result: null })
  })

  test("events published for a run that is not live are dropped", async () => {
    const runId = freshRunId()
    publishRunEvent(runId, { event: "lost" })
    finishLiveRun(runId, { runId, status: "ok", ok: true })

    expect(await collect(runId)).toEqual({ events: [], result: null })
  })
})
