import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { groupRow, IDS, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { inventoryGroupHandler } from "#v1/inventory/handler"
import { inventoryRouter } from "#v1/inventory/router"

const context = userContext()

beforeEach(() => fakeDb.reset())

describe("inventory.groups.create", () => {
  test("inserts the group and returns it", async () => {
    fakeDb.queue("insert", [groupRow()])

    expect(
      await inventoryGroupHandler.create({ context, input: { name: "web" } })
    ).toEqual(groupRow())
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([{ name: "web" }])
  })

  for (const name of ["all", "ALL", "All"]) {
    test(`the reserved name "${name}" is BAD_REQUEST and nothing is written`, async () => {
      await expectErrorCode(
        call(inventoryRouter.groups.create, { name }, { context }),
        "BAD_REQUEST"
      )
      expect(fakeDb.calls()).toEqual([])
    })
  }

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      inventoryGroupHandler.create({ context, input: { name: "web" } }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("inventory.groups.list", () => {
  test("returns every group", async () => {
    fakeDb.queue("select", [groupRow()])

    expect(await inventoryGroupHandler.list({ context })).toEqual([groupRow()])
  })
})

describe("inventory.groups.get", () => {
  test("returns the group", async () => {
    fakeDb.queue("select", [groupRow()])

    expect(
      await inventoryGroupHandler.get({ context, input: { id: IDS.group } })
    ).toEqual(groupRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      inventoryGroupHandler.get({ context, input: { id: IDS.group } }),
      "NOT_FOUND"
    )
  })
})

describe("inventory.groups.update", () => {
  test("a regular rename writes the name and updatedAt without a lookup", async () => {
    fakeDb.queue("update", [groupRow({ name: "db" })])

    await inventoryGroupHandler.update({
      context,
      input: { id: IDS.group, name: "db" },
    })

    expect(fakeDb.calls("select")).toEqual([])
    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ name: "db" })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("renaming a group to the reserved name is BAD_REQUEST and nothing is written", async () => {
    fakeDb.queue("select", [{ name: "web" }])

    await expectErrorCode(
      inventoryGroupHandler.update({
        context,
        input: { id: IDS.group, name: "All" },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a group that already has the reserved name stays editable while it keeps it", async () => {
    fakeDb.queue("select", [{ name: "all" }])
    fakeDb.queue("update", [groupRow({ name: "all", description: "legacy" })])

    await inventoryGroupHandler.update({
      context,
      input: { id: IDS.group, name: "all", description: "legacy" },
    })

    expect(fakeDb.calls("update")).toHaveLength(1)
  })

  test("the reserved name on an unknown group is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      inventoryGroupHandler.update({
        context,
        input: { id: IDS.group, name: "all" },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      inventoryGroupHandler.update({
        context,
        input: { id: IDS.group, name: "db" },
      }),
      "NOT_FOUND"
    )
  })
})

describe("inventory.groups.delete", () => {
  test("returns the deleted group", async () => {
    fakeDb.queue("delete", [groupRow()])

    expect(
      await inventoryGroupHandler.delete({ context, input: { id: IDS.group } })
    ).toEqual(groupRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      inventoryGroupHandler.delete({ context, input: { id: IDS.group } }),
      "NOT_FOUND"
    )
  })
})
