import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  mock,
  test,
} from "bun:test"
import { ORPCError } from "@orpc/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  controlledStream,
  fakeJobRuns,
  resetFakeJobRuns,
} from "@test/unit/fixtures/orpc"
import { act, cleanup, renderHook } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { onRunChange } from "@/features/jobs/lib/run-change-bus"
import type { JobRunChange } from "@/features/jobs/types"

const { useJobRunChanges } = await import(
  "@/features/jobs/hooks/use-job-run-changes"
)
const { orpc } = await import("@/lib/orpc")

type ChangeEvent = { type: "subscribed" } | ({ type: "changed" } & JobRunChange)

const CHANGE: JobRunChange = {
  runId: "run-1",
  jobId: "job-1",
  status: "ok",
  trigger: "schedule",
}

let queryClient: QueryClient
let invalidated: unknown[]

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

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

/** Each `watchChanges` call answers with the next of `streams`. */
function serve(...answers: (() => Promise<unknown>)[]) {
  fakeJobRuns.watchChanges.mockImplementation(() => {
    const next = answers.shift()
    return next ? next() : new Promise(() => {})
  })
}

const ALL_RUN_KEYS = [
  orpc.jobs.runs.list.key(),
  orpc.jobs.runs.get.key(),
  orpc.jobs.runs.listAll.key(),
  orpc.jobs.runs.metrics.key(),
  orpc.jobs.runs.rollups.key(),
]

beforeEach(() => {
  resetFakeJobRuns()
  jest.useFakeTimers()
  queryClient = new QueryClient()
  invalidated = []
  const invalidate = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = ((filters?: {
    queryKey?: readonly unknown[]
  }) => {
    invalidated.push(filters?.queryKey ?? [])
    return invalidate(filters)
  }) as typeof queryClient.invalidateQueries
})

afterEach(() => {
  cleanup()
  jest.useRealTimers()
})

describe("useJobRunChanges", () => {
  test("a change invalidates what it can have changed and reaches the bus", async () => {
    const live = controlledStream<ChangeEvent>()
    serve(() => Promise.resolve(live.stream()))
    const heard = mock()
    const stop = onRunChange(heard)
    renderHook(() => useJobRunChanges({ enabled: true }), { wrapper })

    live.push({ type: "subscribed" })
    await flush()
    // The first subscription comes with a cache the page just loaded.
    expect(invalidated).toEqual([])

    live.push({ type: "changed", ...CHANGE })
    await flush()
    expect(invalidated).toEqual([
      orpc.jobs.runs.list.key({ input: { jobId: "job-1" } }),
      orpc.jobs.runs.get.queryKey({ input: { id: "run-1" } }),
      orpc.jobs.runs.listAll.key(),
      orpc.jobs.runs.metrics.key(),
      orpc.jobs.runs.rollups.key(),
    ])
    expect(heard.mock.calls).toEqual([[CHANGE]])
    stop()
  })

  test("after a lost connection it reconnects and refreshes every run view once", async () => {
    const first = controlledStream<ChangeEvent>()
    const second = controlledStream<ChangeEvent>()
    serve(
      () => Promise.resolve(first.stream()),
      () => Promise.resolve(second.stream())
    )
    renderHook(() => useJobRunChanges({ enabled: true }), { wrapper })

    first.push({ type: "subscribed" })
    await flush()
    first.fail(new TypeError("network error"))
    await flush()
    expect(fakeJobRuns.watchChanges).toHaveBeenCalledTimes(1)

    await advance(1_000)
    expect(fakeJobRuns.watchChanges).toHaveBeenCalledTimes(2)
    second.push({ type: "subscribed" })
    await flush()
    expect(invalidated).toEqual(ALL_RUN_KEYS)
  })

  test("a stream the backend closes is reopened", async () => {
    const first = controlledStream<ChangeEvent>()
    serve(() => Promise.resolve(first.stream()))
    renderHook(() => useJobRunChanges({ enabled: true }), { wrapper })

    first.push({ type: "subscribed" })
    first.end()
    await flush()
    await advance(1_000)
    expect(fakeJobRuns.watchChanges).toHaveBeenCalledTimes(2)
  })

  test("keeps retrying past the console's attempt limit", async () => {
    const down = () => Promise.reject(new TypeError("Failed to fetch"))
    serve(down, down, down, down, down, down, down)
    renderHook(() => useJobRunChanges({ enabled: true }), { wrapper })
    await flush()

    for (let i = 0; i < 7; i++) await advance(8_000)
    expect(fakeJobRuns.watchChanges).toHaveBeenCalledTimes(8)
  })

  test("an API refusal stops it", async () => {
    serve(() => Promise.reject(new ORPCError("FORBIDDEN")))
    renderHook(() => useJobRunChanges({ enabled: true }), { wrapper })
    await flush()

    await advance(60_000)
    expect(fakeJobRuns.watchChanges).toHaveBeenCalledTimes(1)
  })

  test("opens nothing while disabled", async () => {
    renderHook(() => useJobRunChanges({ enabled: false }), { wrapper })
    await flush()
    await advance(10_000)
    expect(fakeJobRuns.watchChanges).not.toHaveBeenCalled()
  })

  test("unmounting cancels a pending reconnect", async () => {
    serve(() => Promise.reject(new TypeError("Failed to fetch")))
    const { unmount } = renderHook(() => useJobRunChanges({ enabled: true }), {
      wrapper,
    })
    await flush()
    unmount()
    await advance(10_000)
    expect(fakeJobRuns.watchChanges).toHaveBeenCalledTimes(1)
  })
})
