import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import {
  IDS,
  jobRow,
  jobSecretVariableRow,
  stepArgs,
} from "@playbook-runner/db/testing"
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
  secretVariables: [],
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
  infisicalConnectionId: null,
  infisicalEnvironment: null,
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
    fakeDb.queue("select", [jobRow()], [])

    expect(await jobsHandler.get({ context, input: { id: IDS.job } })).toEqual({
      ...jobRow(),
      secretVariables: [],
    })
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

describe("job Infisical connection", () => {
  const WITH_CONNECTION = {
    ...JOB,
    infisicalConnectionId: IDS.infisicalConnection,
  }

  test("create stores an existing connection", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])
    fakeDb.queue("insert", [jobRow()])

    await jobsHandler.create({ context, input: WITH_CONNECTION })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      infisicalConnectionId: IDS.infisicalConnection,
    })
  })

  test("create with an unknown connection is BAD_REQUEST and writes nothing", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      jobsHandler.create({ context, input: WITH_CONNECTION }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("update with an unknown connection is BAD_REQUEST and writes nothing", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      jobsHandler.update({
        context,
        input: { ...WITH_CONNECTION, id: IDS.job },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("update with null clears the connection without looking it up", async () => {
    fakeDb.queue("update", [jobRow()])
    fakeDb.queue("delete", undefined)

    await jobsHandler.update({
      context,
      input: { ...JOB, id: IDS.job, infisicalConnectionId: null },
    })

    expect(fakeDb.calls("select")).toEqual([])
    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toMatchObject({
      infisicalConnectionId: null,
    })
  })

  test("the job output carries the connection id", async () => {
    fakeDb.queue(
      "select",
      [jobRow({ infisicalConnectionId: IDS.infisicalConnection })],
      []
    )

    const job = await call(jobsRouter.get, { id: IDS.job }, { context })

    expect(job.infisicalConnectionId).toBe(IDS.infisicalConnection)
  })
})

describe("job secret variables", () => {
  const VARIABLE = {
    name: "api_token",
    secretName: "API_TOKEN",
    secretPath: "/",
  }
  const READABLE = {
    ...JOB,
    infisicalConnectionId: IDS.infisicalConnection,
    infisicalEnvironment: "prod",
    secretVariables: [VARIABLE],
  }

  test("get returns the job's own variables", async () => {
    fakeDb.queue("select", [jobRow()], [jobSecretVariableRow()])

    const job = await jobsHandler.get({ context, input: { id: IDS.job } })

    expect(job.secretVariables).toEqual([VARIABLE])
  })

  test("create stores the environment and the variables", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])
    fakeDb.queue("insert", [jobRow()], undefined)

    const job = await jobsHandler.create({ context, input: READABLE })

    const [created, variables] = fakeDb.calls("insert")
    if (!created || !variables) throw new Error("missing insert")
    expect(stepArgs(created, "values")[0]).toMatchObject({
      infisicalEnvironment: "prod",
    })
    expect(stepArgs(variables, "values")[0]).toEqual([
      {
        jobId: IDS.job,
        variableName: "api_token",
        secretName: "API_TOKEN",
        secretPath: "/",
      },
    ])
    expect(job.secretVariables).toEqual([VARIABLE])
  })

  test("update replaces the variables in one transaction", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])
    fakeDb.queue("update", [jobRow()])
    fakeDb.queue("delete", undefined)
    fakeDb.queue("insert", undefined)

    await jobsHandler.update({
      context,
      input: { ...READABLE, id: IDS.job },
    })

    expect(fakeDb.calls().map((op) => op.op)).toEqual([
      "select",
      "transaction",
      "update",
      "delete",
      "insert",
    ])
  })

  test("the playbook can supply the connection and environment", async () => {
    fakeDb.queue("select", [
      {
        infisicalConnectionId: IDS.infisicalConnection,
        infisicalEnvironment: "dev",
      },
    ])
    fakeDb.queue("insert", [jobRow()], undefined)

    const job = await jobsHandler.create({
      context,
      input: { ...JOB, secretVariables: [VARIABLE] },
    })

    expect(job.secretVariables).toEqual([VARIABLE])
  })

  test("variables with nothing to read from are BAD_REQUEST and write nothing", async () => {
    fakeDb.queue("select", [
      { infisicalConnectionId: null, infisicalEnvironment: null },
    ])

    await expectErrorCode(
      jobsHandler.create({
        context,
        input: { ...JOB, secretVariables: [VARIABLE] },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("variables on a job without a playbook need their own connection", async () => {
    await expectErrorCode(
      jobsHandler.create({
        context,
        input: { ...JOB, playbookId: null, secretVariables: [VARIABLE] },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("an extra var with a variable's name is BAD_REQUEST and writes nothing", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])

    await expectErrorCode(
      jobsHandler.create({
        context,
        input: { ...READABLE, extravarsJson: { api_token: "typed" } },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("reserved names, duplicates and bad environments are BAD_REQUEST", async () => {
    for (const override of [
      { secretVariables: [{ ...VARIABLE, name: "ANSIBLE_ssh_args" }] },
      { secretVariables: [VARIABLE, VARIABLE] },
      { infisicalEnvironment: "dev prod" },
    ]) {
      await expectErrorCode(
        call(jobsRouter.create, { ...READABLE, ...override }, { context }),
        "BAD_REQUEST"
      )
    }
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("jobs.update", () => {
  test("rewrites every column and updatedAt, never the id", async () => {
    fakeDb.queue("update", [jobRow()])
    fakeDb.queue("delete", undefined)

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
