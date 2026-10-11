import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test"
import { ORPCError } from "@orpc/client"
import { fakeJobRuns, resetFakeJobRuns } from "@test/unit/fixtures/orpc"
import { act, cleanup, renderHook } from "@testing-library/react"

type WatchEnd =
  | { result: { runId: string; status: "ok" | "failed"; ok: boolean } | null }
  | { error: unknown }

/** What one `jobs.runs.watch` call does: refuse at once, or stream then end. */
type WatchScript = { reject: unknown } | { events: string[]; end: WatchEnd }

let scripts: WatchScript[] = []
let calls = 0

async function* streamOf(events: string[], end: WatchEnd) {
  for (const event of events) yield { event }
  if ("error" in end) throw end.error
  return end.result
}

function fakeWatch() {
  calls += 1
  const script = scripts.shift()
  if (!script) return new Promise(() => {}) // never answers
  if ("reject" in script) return Promise.reject(script.reject)
  return Promise.resolve(streamOf(script.events, script.end))
}

const { useJobRunWatch } = await import("@/features/jobs/hooks/use-jobs")

/** Lets the stream callbacks (all promise-driven) run to completion. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  })
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms)
  })
  await flush()
}

const ok = { runId: "r1", status: "ok" as const, ok: true }

beforeEach(() => {
  scripts = []
  calls = 0
  resetFakeJobRuns()
  fakeJobRuns.watch.mockImplementation(fakeWatch)
  jest.useFakeTimers()
})

afterEach(() => {
  cleanup()
  jest.useRealTimers()
})

describe("useJobRunWatch", () => {
  test("reattaches after a lost connection without drawing replayed events twice", async () => {
    scripts = [
      { events: ["a", "b"], end: { error: new TypeError("network error") } },
      { events: ["a", "b", "c"], end: { result: ok } },
    ]
    const { result } = renderHook(() => useJobRunWatch())

    act(() => result.current.start("r1"))
    await flush()
    expect(result.current.events.map((e) => e.event)).toEqual(["a", "b"])
    expect(result.current.phase).toBe("running")
    expect(result.current.reconnecting).toBe(true)

    await advance(1_000)
    expect(calls).toBe(2)
    expect(result.current.events.map((e) => e.event)).toEqual(["a", "b", "c"])
    expect(result.current.phase).toBe("done")
    expect(result.current.result).toEqual(ok)
    expect(result.current.reconnecting).toBe(false)
  })

  test("falls back to the stored run when it is no longer live on reattach", async () => {
    scripts = [
      { events: ["a"], end: { error: new TypeError("network error") } },
      { events: [], end: { result: null } },
    ]
    const { result } = renderHook(() => useJobRunWatch())

    act(() => result.current.start("r1"))
    await flush()
    await advance(1_000)
    expect(result.current.phase).toBe("idle")
    expect(result.current.reconnecting).toBe(false)
  })

  test("an API refusal ends in the error state without retrying", async () => {
    scripts = [{ reject: new ORPCError("UNAUTHORIZED", { message: "nope" }) }]
    const { result } = renderHook(() => useJobRunWatch())

    act(() => result.current.start("r1"))
    await flush()
    await advance(30_000)
    expect(calls).toBe(1)
    expect(result.current.phase).toBe("error")
    expect(result.current.errorMessage).toBe("nope")
  })

  test("gives up after the allowed reattaches fail", async () => {
    scripts = Array.from({ length: 10 }, () => ({
      reject: new TypeError("Failed to fetch"),
    }))
    const { result } = renderHook(() => useJobRunWatch())

    act(() => result.current.start("r1"))
    await flush()
    for (const delay of [1_000, 2_000, 4_000, 8_000, 8_000]) {
      expect(result.current.phase).toBe("running")
      await advance(delay)
    }
    expect(calls).toBe(6)
    expect(result.current.phase).toBe("error")
    expect(result.current.reconnecting).toBe(false)
  })

  test("a reattach that reaches the backend resets the backoff", async () => {
    scripts = [
      { reject: new TypeError("Failed to fetch") },
      { events: ["a"], end: { error: new TypeError("network error") } },
      { events: ["a"], end: { result: ok } },
    ]
    const { result } = renderHook(() => useJobRunWatch())

    act(() => result.current.start("r1"))
    await flush()
    await advance(1_000) // attempt 1 reaches the backend, then drops again
    await advance(1_000) // so the next wait is back to 1 s, not 2 s
    expect(calls).toBe(3)
    expect(result.current.phase).toBe("done")
  })

  test("stopping while reconnecting cancels the pending reattach", async () => {
    scripts = [
      { events: ["a"], end: { error: new TypeError("network error") } },
    ]
    const { result } = renderHook(() => useJobRunWatch())

    act(() => result.current.start("r1"))
    await flush()
    act(() => result.current.stopWatching())
    await advance(10_000)
    expect(calls).toBe(1)
    expect(result.current.phase).toBe("cancelled")
    expect(result.current.reconnecting).toBe(false)
  })
})
