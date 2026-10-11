import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { IDS, jobRow, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { resetGrpc } from "#tests/fixtures/grpc"
import { jobsHandler } from "#v1/jobs/handler"
import { jobsRouter } from "#v1/jobs/router"

const context = userContext()
const JOB = {
  name: "Nightly patch",
  playbookId: IDS.playbook,
  inventoryJson: [{ type: "all" as const }],
  extravarsJson: { env: "prod" },
  forks: 5,
  cronExpression: "0 3 * * *",
  enabled: true,
}
const COLUMNS = {
  name: "Nightly patch",
  description: null,
  playbookId: IDS.playbook,
  inventoryJson: [{ type: "all" }],
  extravarsJson: { env: "prod" },
  forks: 5,
  cronExpression: "0 3 * * *",
  enabled: true,
}

beforeEach(() => {
  fakeDb.reset()
  resetGrpc()
})

describe("jobs.list", () => {
  test("returns every job", async () => {
    fakeDb.queue("select", [jobRow()])

    expect(await jobsHandler.list({ context })).toEqual([jobRow()])
  })
})

describe("jobs.get", () => {
  test("returns the job", async () => {
    fakeDb.queue("select", [jobRow()])

    expect(await jobsHandler.get({ context, input: { id: IDS.job } })).toEqual(
      jobRow()
    )
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      jobsHandler.get({ context, input: { id: IDS.job } }),
      "NOT_FOUND"
    )
  })
})

describe("jobs.create", () => {
  test("stores every column, omitted optionals as null", async () => {
    fakeDb.queue("insert", [jobRow()])

    await jobsHandler.create({ context, input: JOB })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([COLUMNS])
  })

  test("a job without a schedule or playbook stores nulls", async () => {
    fakeDb.queue("insert", [jobRow()])

    await jobsHandler.create({
      context,
      input: { ...JOB, playbookId: undefined, cronExpression: undefined },
    })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      playbookId: null,
      cronExpression: null,
    })
  })

  test("an invalid cron expression is BAD_REQUEST and nothing is written", async () => {
    await expectErrorCode(
      call(
        jobsRouter.create,
        { ...JOB, cronExpression: "every night" },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("a reserved extra var is BAD_REQUEST and nothing is written", async () => {
    await expectErrorCode(
      call(
        jobsRouter.create,
        { ...JOB, extravarsJson: { ansible_become_pass: "x" } },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("more than 50 forks is BAD_REQUEST", async () => {
    await expectErrorCode(
      call(jobsRouter.create, { ...JOB, forks: 51 }, { context }),
      "BAD_REQUEST"
    )
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      jobsHandler.create({ context, input: JOB }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("jobs.update", () => {
  test("rewrites every column and updatedAt, never the id", async () => {
    fakeDb.queue("update", [jobRow()])

    await jobsHandler.update({ context, input: { ...JOB, id: IDS.job } })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject(COLUMNS)
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      jobsHandler.update({ context, input: { ...JOB, id: IDS.job } }),
      "NOT_FOUND"
    )
  })
})

describe("jobs.delete", () => {
  test("returns the deleted job", async () => {
    fakeDb.queue("delete", [jobRow()])

    expect(
      await jobsHandler.delete({ context, input: { id: IDS.job } })
    ).toEqual(jobRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      jobsHandler.delete({ context, input: { id: IDS.job } }),
      "NOT_FOUND"
    )
  })
})

describe("jobs.toggleEnabled", () => {
  test("writes only the flag and updatedAt", async () => {
    fakeDb.queue("update", [jobRow({ enabled: false })])

    await jobsHandler.toggleEnabled({
      context,
      input: { id: IDS.job, enabled: false },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")).toEqual([
      { enabled: false, updatedAt: expect.any(Date) },
    ])
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      jobsHandler.toggleEnabled({
        context,
        input: { id: IDS.job, enabled: true },
      }),
      "NOT_FOUND"
    )
  })
})

describe("jobs.run", () => {
  test("a job that is gone is NOT_FOUND and no run is opened", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [])

    await expectErrorCode(
      jobsHandler.run({ context, input: { id: IDS.job } }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("a job that is already running is CONFLICT and no run is opened", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [jobRow()], [{ id: IDS.jobRun }])

    await expectErrorCode(
      jobsHandler.run({ context, input: { id: IDS.job } }),
      "CONFLICT"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })
})
