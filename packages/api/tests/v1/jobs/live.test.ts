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
async function collect(runId: string, signal?: AbortSignal) {
  const events: unknown[] = []
  const watcher = watchLiveRun(runId, signal)
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

  test("a watcher that has not read yet still gets every event of a verbose run, in order", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    const watcher = watchLiveRun(runId)
    // The first read subscribes; everything after it queues on the live
    // subscription, well past the publisher's default buffer of 100.
    publishRunEvent(runId, { event: "e0" })
    expect(await watcher.next()).toEqual({
      done: false,
      value: { event: "e0" },
    })
    for (let i = 1; i < 500; i++) publishRunEvent(runId, { event: `e${i}` })
    finishLiveRun(runId, { runId, status: "ok", ok: true })

    const seen: unknown[] = []
    for (;;) {
      const next = await watcher.next()
      if (next.done) {
        expect(next.value).toEqual({ runId, status: "ok", ok: true })
        break
      }
      seen.push(next.value)
    }
    expect(seen).toEqual(
      Array.from({ length: 499 }, (_, i) => ({ event: `e${i + 1}` }))
    )
  })

  test("events published while a watcher replays its backlog arrive exactly once", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    publishRunEvent(runId, { event: "a" })
    publishRunEvent(runId, { event: "b" })

    const watcher = watchLiveRun(runId)
    expect((await watcher.next()).value).toEqual({ event: "a" })
    // Subscribed and mid-replay: "c" is past the copied backlog.
    publishRunEvent(runId, { event: "c" })
    finishLiveRun(runId, { runId, status: "ok", ok: true })

    const rest: unknown[] = []
    for (;;) {
      const next = await watcher.next()
      if (next.done) break
      rest.push(next.value)
    }
    expect(rest).toEqual([{ event: "b" }, { event: "c" }])
  })

  test("every watcher of the same run gets the full sequence and result", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    publishRunEvent(runId, { event: "first" })

    const early = collect(runId)
    await settle()
    publishRunEvent(runId, { event: "second" })
    const late = collect(runId)
    await settle()
    publishRunEvent(runId, { event: "third" })
    finishLiveRun(runId, { runId, status: "failed", ok: false })

    const expected = {
      events: [{ event: "first" }, { event: "second" }, { event: "third" }],
      result: { runId, status: "failed" as const, ok: false },
    }
    expect(await early).toEqual(expected)
    expect(await late).toEqual(expected)
  })

  test("aborting a watcher during a silent stretch ends it at once and leaves the run and other watchers alone", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    publishRunEvent(runId, { event: "start" })

    const controller = new AbortController()
    const leaving = watchLiveRun(runId, controller.signal)
    const staying = collect(runId)
    expect((await leaving.next()).value).toEqual({ event: "start" })

    // No event is coming: the pending read must still settle on abort.
    const pending = leaving.next()
    await settle()
    controller.abort()
    expect(await pending).toEqual({ done: true, value: null })

    publishRunEvent(runId, { event: "after" })
    finishLiveRun(runId, { runId, status: "ok", ok: true })
    expect(await staying).toEqual({
      events: [{ event: "start" }, { event: "after" }],
      result: { runId, status: "ok", ok: true },
    })
  })

  test("a watcher whose signal is already aborted returns null without subscribing", async () => {
    const runId = freshRunId()
    beginLiveRun(runId)
    publishRunEvent(runId, { event: "ignored" })
    const controller = new AbortController()
    controller.abort()

    expect(await collect(runId, controller.signal)).toEqual({
      events: [],
      result: null,
    })
    finishLiveRun(runId, { runId, status: "ok", ok: true })
  })
})
