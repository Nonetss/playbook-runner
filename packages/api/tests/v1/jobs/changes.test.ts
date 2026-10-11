import { describe, expect, test } from "bun:test"
import { settle } from "#tests/fixtures/grpc"
import { followRunChanges } from "#v1/jobs/changes"
import { publishRunChange, type RunChange } from "#v1/jobs/events"

function change(overrides: Partial<RunChange> = {}): RunChange {
  return {
    runId: "run-1",
    jobId: "job-1",
    status: "running",
    trigger: "schedule",
    ...overrides,
  }
}

describe("followRunChanges", () => {
  test("opens with subscribed, then every change published after it, in order", async () => {
    const controller = new AbortController()
    const stream = followRunChanges(controller.signal)

    expect(await stream.next()).toEqual({
      done: false,
      value: { type: "subscribed" },
    })
    publishRunChange(change())
    publishRunChange(change({ status: "failed" }))

    expect((await stream.next()).value).toEqual({
      type: "changed",
      ...change(),
    })
    expect((await stream.next()).value).toEqual({
      type: "changed",
      ...change({ status: "failed" }),
    })
    controller.abort()
    expect(await stream.next()).toEqual({ done: true, value: undefined })
  })

  test("every open stream hears the same change", async () => {
    const first = new AbortController()
    const second = new AbortController()
    const a = followRunChanges(first.signal)
    const b = followRunChanges(second.signal)
    await a.next()
    await b.next()

    publishRunChange(change({ runId: "shared", trigger: "manual" }))
    expect((await a.next()).value).toMatchObject({ runId: "shared" })
    expect((await b.next()).value).toMatchObject({ runId: "shared" })
    first.abort()
    second.abort()
  })

  test("aborting while no change is coming ends the stream at once", async () => {
    const controller = new AbortController()
    const stream = followRunChanges(controller.signal)
    await stream.next()

    const pending = stream.next()
    await settle()
    controller.abort()
    expect(await pending).toEqual({ done: true, value: undefined })
  })

  test("an already-aborted signal yields nothing", async () => {
    const controller = new AbortController()
    controller.abort()
    const stream = followRunChanges(controller.signal)
    expect(await stream.next()).toEqual({ done: true, value: undefined })
  })
})
