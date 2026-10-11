import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, jobRunRow, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { jobRunsHandler } from "#v1/jobs/handler"

const context = userContext()
const STARTED = new Date("2026-01-01T10:00:00.000Z")
const FINISHED = new Date("2026-01-01T10:01:30.000Z")

/** A run as the feed query reads it: base columns plus the job's name. */
function feedRow(index: number, overrides: { jobName?: string | null } = {}) {
  return {
    id: `00000000-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`,
    jobId: IDS.job,
    status: "ok" as const,
    trigger: "schedule",
    startedAt: STARTED,
    finishedAt: FINISHED,
    createdAt: new Date(Date.UTC(2026, 0, 1, 10, 0, 59 - index)),
    hostsOk: 3,
    hostsFailed: 0,
    jobName: "Nightly patch",
    ...overrides,
  }
}

beforeEach(() => fakeDb.reset())

describe("jobs.runs.list", () => {
  test("returns the job's runs without a limit when none is asked for", async () => {
    fakeDb.queue("select", [jobRunRow()])

    expect(
      await jobRunsHandler.list({ context, input: { jobId: IDS.job } })
    ).toEqual([jobRunRow()])
    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    expect(stepArgs(select, "offset")).toEqual([0])
    expect(select.steps.some((step) => step.method === "limit")).toBe(false)
  })

  test("pages with the given limit and offset", async () => {
    fakeDb.queue("select", [])

    await jobRunsHandler.list({
      context,
      input: { jobId: IDS.job, limit: 10, offset: 20 },
    })

    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    expect(stepArgs(select, "offset")).toEqual([20])
    expect(stepArgs(select, "limit")).toEqual([10])
  })
})

describe("jobs.runs.get", () => {
  test("returns the run", async () => {
    fakeDb.queue("select", [jobRunRow()])

    expect(
      await jobRunsHandler.get({ context, input: { id: IDS.jobRun } })
    ).toEqual(jobRunRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      jobRunsHandler.get({ context, input: { id: IDS.jobRun } }),
      "NOT_FOUND"
    )
  })
})

describe("jobs.runs.listAll", () => {
  test("a full page returns a cursor pointing at its last run", async () => {
    const rows = [feedRow(1), feedRow(2)]
    fakeDb.queue("select", rows)

    const page = await jobRunsHandler.listAll({ context, input: { limit: 2 } })

    expect(page.runs.map((run) => run.id)).toEqual(rows.map((row) => row.id))
    expect(page.nextCursor).toBe(
      `${rows[1]?.createdAt.toISOString()}|${rows[1]?.id}`
    )
  })

  test("a short page is the last one and has no cursor", async () => {
    fakeDb.queue("select", [feedRow(1)])

    const page = await jobRunsHandler.listAll({ context, input: { limit: 2 } })

    expect(page.nextCursor).toBeNull()
  })

  test("a cursor resumes after the run it points at", async () => {
    fakeDb.queue("select", [])
    const cursor = `${feedRow(2).createdAt.toISOString()}|${feedRow(2).id}`

    await jobRunsHandler.listAll({ context, input: { limit: 2, cursor } })

    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    expect(stepArgs(select, "where")).toHaveLength(1)
  })

  test("a malformed cursor starts from the newest run", async () => {
    fakeDb.queue("select", [])

    await jobRunsHandler.listAll({
      context,
      input: { limit: 2, cursor: "garbage" },
    })

    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    expect(select.steps.some((step) => step.method === "where")).toBe(false)
  })

  test("maps each run with its duration and keeps a deleted job's null name", async () => {
    fakeDb.queue("select", [
      feedRow(1, { jobName: null }),
      { ...feedRow(2), finishedAt: null },
    ])

    const { runs } = await jobRunsHandler.listAll({
      context,
      input: { limit: 25 },
    })

    expect(runs[0]).toMatchObject({ jobName: null, durationMs: 90_000 })
    expect(runs[1]).toMatchObject({ durationMs: null })
  })
})

describe("jobs.runs.metrics", () => {
  test("derives the success rate and average duration", async () => {
    fakeDb.queue("select", [
      { total: 4, okCount: 3, failedCount: 1, avgDurationMs: "1500.5" },
    ])

    expect(
      await jobRunsHandler.metrics({ context, input: { window: "7d" } })
    ).toEqual({
      window: "7d",
      total: 4,
      okCount: 3,
      failedCount: 1,
      successRate: 0.75,
      avgDurationMs: 1500.5,
    })
  })

  test("an empty window is all zeros instead of dividing by zero", async () => {
    fakeDb.queue("select", [
      { total: 0, okCount: 0, failedCount: 0, avgDurationMs: null },
    ])

    expect(
      await jobRunsHandler.metrics({ context, input: { window: "24h" } })
    ).toEqual({
      window: "24h",
      total: 0,
      okCount: 0,
      failedCount: 0,
      successRate: 0,
      avgDurationMs: 0,
    })
  })
})

describe("jobs.runs.rollups", () => {
  test("reports each job's latest run and recent success ratio", async () => {
    fakeDb.queue("select", [
      {
        jobId: IDS.job,
        jobName: "Nightly patch",
        latestRunId: IDS.jobRun,
        latestStatus: "failed",
        latestCreatedAt: STARTED,
        successOkCount: 7,
        successTotal: 10,
        latestDurationMs: "90000.4",
      },
    ])

    expect(await jobRunsHandler.rollups({ context, input: {} })).toEqual([
      {
        jobId: IDS.job,
        jobName: "Nightly patch",
        latestRunId: IDS.jobRun,
        latestStatus: "failed",
        latestCreatedAt: STARTED,
        latestDurationMs: 90_000,
        recentSuccessRatio: 0.7,
        recentRunCount: 10,
      },
    ])
  })

  test("a job that never ran keeps its row with empty values", async () => {
    fakeDb.queue("select", [
      {
        jobId: IDS.job,
        jobName: "Never ran",
        latestRunId: null,
        latestStatus: null,
        latestCreatedAt: null,
        successOkCount: null,
        successTotal: null,
        latestDurationMs: null,
      },
    ])

    expect(await jobRunsHandler.rollups({ context, input: {} })).toEqual([
      {
        jobId: IDS.job,
        jobName: "Never ran",
        latestRunId: null,
        latestStatus: null,
        latestCreatedAt: null,
        latestDurationMs: null,
        recentSuccessRatio: 0,
        recentRunCount: 0,
      },
    ])
  })
})
