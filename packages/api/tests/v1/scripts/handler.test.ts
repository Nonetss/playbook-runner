import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, scriptRow, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { scriptsHandler } from "#v1/scripts/handler"

const context = userContext()
const SCRIPT = {
  name: "uptime",
  description: "How long hosts have been up",
  content: "uptime\n",
  language: "bash" as const,
}

beforeEach(() => fakeDb.reset())

describe("scripts.create", () => {
  test("inserts the script and returns the stored row", async () => {
    const row = scriptRow()
    fakeDb.queue("insert", [row])

    expect(await scriptsHandler.create({ context, input: SCRIPT })).toEqual(row)
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([SCRIPT])
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      scriptsHandler.create({ context, input: SCRIPT }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("scripts.list", () => {
  test("returns every script", async () => {
    const rows = [scriptRow(), scriptRow({ id: IDS.job, name: "df" })]
    fakeDb.queue("select", rows)

    expect(await scriptsHandler.list({ context })).toEqual(rows)
  })
})

describe("scripts.get", () => {
  test("returns the script", async () => {
    const row = scriptRow()
    fakeDb.queue("select", [row])

    expect(
      await scriptsHandler.get({ context, input: { id: IDS.script } })
    ).toEqual(row)
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      scriptsHandler.get({ context, input: { id: IDS.script } }),
      "NOT_FOUND"
    )
  })
})

describe("scripts.update", () => {
  test("writes the new values and updatedAt, never the id", async () => {
    const row = scriptRow({ name: "renamed" })
    fakeDb.queue("update", [row])

    const result = await scriptsHandler.update({
      context,
      input: { ...SCRIPT, id: IDS.script, name: "renamed" },
    })

    expect(result).toEqual(row)
    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ ...SCRIPT, name: "renamed" })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      scriptsHandler.update({ context, input: { ...SCRIPT, id: IDS.script } }),
      "NOT_FOUND"
    )
  })
})

describe("scripts.delete", () => {
  test("returns the deleted row", async () => {
    const row = scriptRow()
    fakeDb.queue("delete", [row])

    expect(
      await scriptsHandler.delete({ context, input: { id: IDS.script } })
    ).toEqual(row)
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      scriptsHandler.delete({ context, input: { id: IDS.script } }),
      "NOT_FOUND"
    )
  })
})
