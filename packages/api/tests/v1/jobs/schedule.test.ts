import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, stepArgs } from "@playbook-runner/db/testing"
import { fakeDb } from "#tests/fixtures/db"
import { listScheduledJobs } from "#v1/jobs/schedule"

beforeEach(() => fakeDb.reset())

describe("listScheduledJobs", () => {
  test("reads only the id and cron expression of the jobs", async () => {
    const rows = [{ id: IDS.job, cronExpression: "0 3 * * *" }]
    fakeDb.queue("select", rows)

    expect(await listScheduledJobs()).toEqual(rows)
    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    const [columns] = stepArgs(select, "select")
    expect(Object.keys(columns ?? {})).toEqual(["id", "cronExpression"])
    expect(stepArgs(select, "where")).toHaveLength(1)
  })
})
