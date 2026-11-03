import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import {
  IDS,
  playbookSecretVariableRow,
  stepArgs,
} from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { playbooksHandler } from "#v1/playbooks/handler"
import { playbooksRouter } from "#v1/playbooks/router"

const context = userContext()
const VARIABLE = {
  name: "db_password",
  secretName: "DB_PASSWORD",
  secretPath: "/",
}
const DECLARATION = {
  id: IDS.playbook,
  infisicalConnectionId: IDS.infisicalConnection,
  infisicalEnvironment: "dev",
  variables: [VARIABLE],
}

beforeEach(() => fakeDb.reset())

describe("playbooks.secretVariables.get", () => {
  test("returns the connection, environment and variables", async () => {
    fakeDb.queue(
      "select",
      [
        {
          infisicalConnectionId: IDS.infisicalConnection,
          infisicalEnvironment: "dev",
        },
      ],
      [playbookSecretVariableRow()]
    )

    expect(
      await playbooksHandler.secretVariables.get({
        context,
        input: { id: IDS.playbook },
      })
    ).toEqual({
      infisicalConnectionId: IDS.infisicalConnection,
      infisicalEnvironment: "dev",
      variables: [VARIABLE],
    })
  })

  test("an unknown playbook is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.secretVariables.get({
        context,
        input: { id: IDS.playbook },
      }),
      "NOT_FOUND"
    )
  })
})

describe("playbooks.secretVariables.set", () => {
  test("replaces the declaration in one transaction", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])
    fakeDb.queue("update", [{ id: IDS.playbook }])
    fakeDb.queue("delete", undefined)
    fakeDb.queue("insert", undefined)

    const saved = await playbooksHandler.secretVariables.set({
      context,
      input: DECLARATION,
    })

    expect(saved.variables).toEqual([VARIABLE])
    expect(fakeDb.calls().map((op) => op.op)).toEqual([
      "select",
      "transaction",
      "update",
      "delete",
      "insert",
    ])
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toEqual([
      {
        playbookId: IDS.playbook,
        variableName: "db_password",
        secretName: "DB_PASSWORD",
        secretPath: "/",
      },
    ])
  })

  test("never checks the playbook's source, so Git playbooks work", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])
    fakeDb.queue("update", [{ id: IDS.playbook }])
    fakeDb.queue("delete", undefined)
    fakeDb.queue("insert", undefined)

    await playbooksHandler.secretVariables.set({ context, input: DECLARATION })

    expect(fakeDb.calls("select")).toHaveLength(1)
  })

  test("no connection clears the environment and the variables", async () => {
    fakeDb.queue("update", [{ id: IDS.playbook }])
    fakeDb.queue("delete", undefined)

    const saved = await playbooksHandler.secretVariables.set({
      context,
      input: {
        id: IDS.playbook,
        infisicalConnectionId: null,
        infisicalEnvironment: "dev",
        variables: [],
      },
    })

    expect(saved).toEqual({
      infisicalConnectionId: null,
      infisicalEnvironment: null,
      variables: [],
    })
    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({
      infisicalConnectionId: null,
      infisicalEnvironment: null,
    })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("an unknown connection is BAD_REQUEST and writes nothing", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.secretVariables.set({ context, input: DECLARATION }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("an unknown playbook is NOT_FOUND and removes nothing", async () => {
    fakeDb.queue("select", [{ id: IDS.infisicalConnection }])
    fakeDb.queue("update", [])

    await expectErrorCode(
      playbooksHandler.secretVariables.set({ context, input: DECLARATION }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test.each([
    ["without a connection", { infisicalConnectionId: null }],
    ["without an environment", { infisicalEnvironment: null }],
    [
      "with a reserved name",
      { variables: [{ ...VARIABLE, name: "ansible_host" }] },
    ],
    [
      "with mixed-case reserved name",
      { variables: [{ ...VARIABLE, name: "ANSIBLE_ssh_args" }] },
    ],
    ["with duplicate names", { variables: [VARIABLE, VARIABLE] }],
    ["with an invalid environment", { infisicalEnvironment: "dev prod" }],
  ])("variables %s are BAD_REQUEST and write nothing", async (_, override) => {
    await expectErrorCode(
      call(
        playbooksRouter.secretVariables.set,
        { ...DECLARATION, ...override },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})
