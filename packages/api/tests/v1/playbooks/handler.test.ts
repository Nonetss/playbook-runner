import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { IDS, playbookRow, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { playbooksHandler } from "#v1/playbooks/handler"
import { playbooksRouter } from "#v1/playbooks/router"

const context = userContext()
const PLAYBOOK = {
  name: "site.yml",
  description: "",
  content: "- hosts: all\n  tasks: []\n",
}
const GIT_PLAYBOOK = playbookRow({
  source: "git",
  repositoryId: IDS.repository,
  path: "site.yml",
})

beforeEach(() => fakeDb.reset())

describe("playbooks.create", () => {
  test("inserts an inline playbook at the root without a folder lookup", async () => {
    fakeDb.queue("insert", [playbookRow()])

    expect(await playbooksHandler.create({ context, input: PLAYBOOK })).toEqual(
      playbookRow()
    )
    expect(fakeDb.calls("select")).toEqual([])
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([
      { ...PLAYBOOK, source: "inline" },
    ])
  })

  test("a missing folder is BAD_REQUEST and nothing is written", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.create({
        context,
        input: { ...PLAYBOOK, folderId: IDS.folder },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("the UI's root sentinel is stored as no folder", async () => {
    fakeDb.queue("insert", [playbookRow()])

    await call(
      playbooksRouter.create,
      { ...PLAYBOOK, folderId: "__root__" },
      { context }
    )

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({ folderId: null })
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      playbooksHandler.create({ context, input: PLAYBOOK }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("playbooks.list", () => {
  test("returns every playbook, inline and Git", async () => {
    const rows = [playbookRow(), GIT_PLAYBOOK]
    fakeDb.queue("select", rows)

    expect(await playbooksHandler.list({ context })).toEqual(rows)
  })
})

describe("playbooks.listByFolder", () => {
  test("returns the folder's playbooks", async () => {
    fakeDb.queue("select", [playbookRow({ folderId: IDS.folder })])

    expect(
      await playbooksHandler.listByFolder({
        context,
        input: { folderId: IDS.folder },
      })
    ).toEqual([playbookRow({ folderId: IDS.folder })])
  })
})

describe("playbooks.get", () => {
  test("returns a Git playbook too", async () => {
    fakeDb.queue("select", [GIT_PLAYBOOK])

    expect(
      await playbooksHandler.get({ context, input: { id: IDS.playbook } })
    ).toEqual(GIT_PLAYBOOK)
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.get({ context, input: { id: IDS.playbook } }),
      "NOT_FOUND"
    )
  })
})

describe("playbooks.update", () => {
  test("writes an inline playbook's values and updatedAt, never the id", async () => {
    fakeDb.queue("select", [{ source: "inline" }])
    fakeDb.queue("update", [playbookRow({ name: "new.yml" })])

    await playbooksHandler.update({
      context,
      input: { ...PLAYBOOK, id: IDS.playbook, name: "new.yml" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ ...PLAYBOOK, name: "new.yml" })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("a Git playbook is FORBIDDEN and nothing is written", async () => {
    fakeDb.queue("select", [{ source: "git" }])

    await expectErrorCode(
      playbooksHandler.update({
        context,
        input: { ...PLAYBOOK, id: IDS.playbook },
      }),
      "FORBIDDEN"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("an unknown id is NOT_FOUND and nothing is written", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.update({
        context,
        input: { ...PLAYBOOK, id: IDS.playbook },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("moving it into a missing folder is BAD_REQUEST and nothing is written", async () => {
    fakeDb.queue("select", [{ source: "inline" }], [])

    await expectErrorCode(
      playbooksHandler.update({
        context,
        input: { ...PLAYBOOK, id: IDS.playbook, folderId: IDS.folder },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })
})

describe("playbooks.move", () => {
  test("writes only the folder and updatedAt", async () => {
    fakeDb.queue("select", [{ source: "inline" }], [{ id: IDS.folder }])
    fakeDb.queue("update", [playbookRow({ folderId: IDS.folder })])

    await playbooksHandler.move({
      context,
      input: { id: IDS.playbook, folderId: IDS.folder },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")).toEqual([
      { folderId: IDS.folder, updatedAt: expect.any(Date) },
    ])
  })

  test("a Git playbook is FORBIDDEN and nothing is written", async () => {
    fakeDb.queue("select", [{ source: "git" }])

    await expectErrorCode(
      playbooksHandler.move({
        context,
        input: { id: IDS.playbook, folderId: null },
      }),
      "FORBIDDEN"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a missing target folder is BAD_REQUEST and nothing is written", async () => {
    fakeDb.queue("select", [{ source: "inline" }], [])

    await expectErrorCode(
      playbooksHandler.move({
        context,
        input: { id: IDS.playbook, folderId: IDS.folder },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })
})

describe("playbooks.delete", () => {
  test("deletes an inline playbook", async () => {
    fakeDb.queue("select", [{ source: "inline" }])
    fakeDb.queue("delete", [playbookRow()])

    expect(
      await playbooksHandler.delete({ context, input: { id: IDS.playbook } })
    ).toEqual(playbookRow())
  })

  test("a Git playbook is FORBIDDEN and nothing is deleted", async () => {
    fakeDb.queue("select", [{ source: "git" }])

    await expectErrorCode(
      playbooksHandler.delete({ context, input: { id: IDS.playbook } }),
      "FORBIDDEN"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test("an unknown id is NOT_FOUND and nothing is deleted", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.delete({ context, input: { id: IDS.playbook } }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })
})
