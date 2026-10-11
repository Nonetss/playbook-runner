import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, playbookFolderRow, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  assertFolderExists,
  playbookFoldersHandler,
} from "#v1/playbooks/folders"

const context = userContext()

beforeEach(() => fakeDb.reset())

describe("assertFolderExists", () => {
  test("no folder (root) passes without a query", async () => {
    await assertFolderExists(null)
    await assertFolderExists(undefined)

    expect(fakeDb.calls()).toEqual([])
  })

  test("an existing folder passes", async () => {
    fakeDb.queue("select", [{ id: IDS.folder }])

    await assertFolderExists(IDS.folder)

    expect(fakeDb.calls("select")).toHaveLength(1)
  })

  test("a missing folder is BAD_REQUEST", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(assertFolderExists(IDS.folder), "BAD_REQUEST")
  })
})

describe("playbooks.folders.create", () => {
  test("inserts the folder and returns it", async () => {
    fakeDb.queue("insert", [playbookFolderRow()])

    expect(
      await playbookFoldersHandler.create({
        context,
        input: { name: "Maintenance" },
      })
    ).toEqual(playbookFolderRow())
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([{ name: "Maintenance" }])
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      playbookFoldersHandler.create({ context, input: { name: "x" } }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("playbooks.folders.list", () => {
  test("returns every folder", async () => {
    fakeDb.queue("select", [playbookFolderRow()])

    expect(await playbookFoldersHandler.list({ context })).toEqual([
      playbookFolderRow(),
    ])
  })
})

describe("playbooks.folders.get", () => {
  test("returns the folder", async () => {
    fakeDb.queue("select", [playbookFolderRow()])

    expect(
      await playbookFoldersHandler.get({ context, input: { id: IDS.folder } })
    ).toEqual(playbookFolderRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbookFoldersHandler.get({ context, input: { id: IDS.folder } }),
      "NOT_FOUND"
    )
  })
})

describe("playbooks.folders.update", () => {
  test("writes the new values and updatedAt, never the id", async () => {
    fakeDb.queue("update", [playbookFolderRow({ name: "Ops" })])

    await playbookFoldersHandler.update({
      context,
      input: { id: IDS.folder, name: "Ops" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ name: "Ops" })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      playbookFoldersHandler.update({
        context,
        input: { id: IDS.folder, name: "Ops" },
      }),
      "NOT_FOUND"
    )
  })
})

describe("playbooks.folders.delete", () => {
  test("returns the deleted folder", async () => {
    fakeDb.queue("delete", [playbookFolderRow()])

    expect(
      await playbookFoldersHandler.delete({
        context,
        input: { id: IDS.folder },
      })
    ).toEqual(playbookFolderRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      playbookFoldersHandler.delete({ context, input: { id: IDS.folder } }),
      "NOT_FOUND"
    )
  })
})
