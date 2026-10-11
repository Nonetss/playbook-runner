import { describe, expect, mock, test } from "bun:test"
import {
  emitRunChange,
  onRunChange,
  shouldFollowNewRun,
} from "@/features/jobs/lib/run-change-bus"
import type { JobRunChange } from "@/features/jobs/types"

function change(overrides: Partial<JobRunChange> = {}): JobRunChange {
  return {
    runId: "new",
    jobId: "job-1",
    status: "running",
    trigger: "schedule",
    ...overrides,
  }
}

describe("run change bus", () => {
  test("listeners hear every change until they unsubscribe", () => {
    const first = mock()
    const second = mock()
    const stopFirst = onRunChange(first)
    const stopSecond = onRunChange(second)

    emitRunChange(change())
    stopFirst()
    emitRunChange(change({ status: "ok" }))
    stopSecond()
    emitRunChange(change({ status: "failed" }))

    expect(first.mock.calls).toEqual([[change()]])
    expect(second.mock.calls).toEqual([[change()], [change({ status: "ok" })]])
  })
})

describe("shouldFollowNewRun", () => {
  const base = { pageJobId: "job-1", newestRunId: "latest" }

  test("follows a new run of this job when nothing is selected", () => {
    expect(
      shouldFollowNewRun({ ...base, change: change(), selectedId: null })
    ).toBe(true)
  })

  test("follows when the newest run is selected", () => {
    expect(
      shouldFollowNewRun({ ...base, change: change(), selectedId: "latest" })
    ).toBe(true)
  })

  test("follows when that very run is already selected", () => {
    expect(
      shouldFollowNewRun({ ...base, change: change(), selectedId: "new" })
    ).toBe(true)
  })

  test("keeps an older run the user picked", () => {
    expect(
      shouldFollowNewRun({ ...base, change: change(), selectedId: "older" })
    ).toBe(false)
  })

  test("ignores runs of other jobs", () => {
    expect(
      shouldFollowNewRun({
        ...base,
        change: change({ jobId: "job-2" }),
        selectedId: null,
      })
    ).toBe(false)
  })

  test("ignores finishes", () => {
    for (const status of ["ok", "failed"] as const) {
      expect(
        shouldFollowNewRun({
          ...base,
          change: change({ status }),
          selectedId: null,
        })
      ).toBe(false)
    }
  })
})
