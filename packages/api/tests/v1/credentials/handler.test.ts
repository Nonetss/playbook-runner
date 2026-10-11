import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { credentialRow, IDS, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { decryptSecret } from "#v1/credentials/crypto"
import { credentialsHandler } from "#v1/credentials/handler"
import { credentialsRouter } from "#v1/credentials/router"

const context = userContext()
const PRIVATE_KEY =
  "-----BEGIN OPENSSH PRIVATE KEY-----\nsecret\n-----END OPENSSH PRIVATE KEY-----\n"
const INPUT = {
  name: "deploy",
  username: "ansible",
  privateKey: PRIVATE_KEY,
  publicKey: "ssh-ed25519 AAAA deploy",
}

/** The credential as the handler reads it back: no private key column. */
function publicRow() {
  const { privateKey: _, ...row } = credentialRow()
  return row
}

/** The `privateKey` a write sent, or "" when it sent none. */
function writtenPrivateKey(values: unknown): string {
  const key =
    typeof values === "object" && values !== null
      ? Reflect.get(values, "privateKey")
      : undefined
  return typeof key === "string" ? key : ""
}

/** The column names a `select(...)`/`returning(...)` step asked for. */
function selectedColumns(args: unknown[]): string[] {
  const [columns] = args
  return typeof columns === "object" && columns !== null
    ? Object.keys(columns)
    : []
}

beforeEach(() => fakeDb.reset())

describe("credentials.generate", () => {
  test("returns a fresh OpenSSH ed25519 pair without writing anything", async () => {
    const pair = await credentialsHandler.generate({
      context,
      input: { comment: "ops" },
    })

    expect(pair.privateKey).toContain("BEGIN OPENSSH PRIVATE KEY")
    expect(pair.publicKey).toStartWith("ssh-ed25519 ")
    expect(pair.publicKey).toEndWith(" ops")
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("credentials.create", () => {
  test("stores the private key encrypted and never reads it back", async () => {
    fakeDb.queue("insert", [publicRow()])

    const result = await credentialsHandler.create({ context, input: INPUT })

    expect(result).not.toHaveProperty("privateKey")
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    const [values] = stepArgs(insert, "values")
    expect(values).toMatchObject({
      name: INPUT.name,
      username: INPUT.username,
      publicKey: INPUT.publicKey,
    })
    const stored = writtenPrivateKey(values)
    expect(stored).toStartWith("v1:")
    expect(stored).not.toContain("secret")
    expect(decryptSecret(stored)).toBe(PRIVATE_KEY)
    expect(selectedColumns(stepArgs(insert, "returning"))).not.toContain(
      "privateKey"
    )
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      credentialsHandler.create({ context, input: INPUT }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("credentials.list", () => {
  test("selects only the public columns", async () => {
    fakeDb.queue("select", [publicRow()])

    expect(await credentialsHandler.list({ context })).toEqual([publicRow()])
    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    const columns = selectedColumns(stepArgs(select, "select"))
    expect(columns).toContain("publicKey")
    expect(columns).not.toContain("privateKey")
  })

  test("the procedure output drops a private key even if one is read", async () => {
    fakeDb.queue("select", [credentialRow()])

    const [listed] = await call(credentialsRouter.list, undefined, { context })

    expect(listed).toBeDefined()
    expect(listed).not.toHaveProperty("privateKey")
  })
})

describe("credentials.get", () => {
  test("returns the credential without its private key", async () => {
    fakeDb.queue("select", [publicRow()])

    const result = await credentialsHandler.get({
      context,
      input: { id: IDS.credential },
    })

    expect(result).toEqual(publicRow())
    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    expect(selectedColumns(stepArgs(select, "select"))).not.toContain(
      "privateKey"
    )
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      credentialsHandler.get({ context, input: { id: IDS.credential } }),
      "NOT_FOUND"
    )
  })

  test("the procedure output drops a private key even if one is read", async () => {
    fakeDb.queue("select", [credentialRow()])

    const result = await call(
      credentialsRouter.get,
      { id: IDS.credential },
      { context }
    )

    expect(result).not.toHaveProperty("privateKey")
  })
})

describe("credentials.update", () => {
  test("re-encrypts a new private key and sets updatedAt, never the id", async () => {
    fakeDb.queue("update", [publicRow()])

    await credentialsHandler.update({
      context,
      input: { ...INPUT, id: IDS.credential },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).not.toHaveProperty("id")
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    const stored = writtenPrivateKey(values)
    expect(stored).toStartWith("v1:")
    expect(decryptSecret(stored)).toBe(PRIVATE_KEY)
    expect(selectedColumns(stepArgs(update, "returning"))).not.toContain(
      "privateKey"
    )
  })

  test("omitted keys keep the stored ones", async () => {
    fakeDb.queue("update", [publicRow()])

    await credentialsHandler.update({
      context,
      input: { id: IDS.credential, name: "renamed", username: "root" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ name: "renamed", username: "root" })
    expect(values).not.toHaveProperty("privateKey")
    expect(values).not.toHaveProperty("publicKey")
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      credentialsHandler.update({
        context,
        input: { id: IDS.credential, name: "x", username: "y" },
      }),
      "NOT_FOUND"
    )
  })
})

describe("credentials.delete", () => {
  test("returns the deleted credential without its private key", async () => {
    fakeDb.queue("delete", [publicRow()])

    expect(
      await credentialsHandler.delete({
        context,
        input: { id: IDS.credential },
      })
    ).toEqual(publicRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      credentialsHandler.delete({ context, input: { id: IDS.credential } }),
      "NOT_FOUND"
    )
  })
})
