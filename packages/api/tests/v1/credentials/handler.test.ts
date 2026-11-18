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
const TOKEN = "ghp_exampleTokenValue123"
const INPUT = {
  type: "ssh_key" as const,
  scope: "host" as const,
  name: "deploy",
  username: "ansible",
  privateKey: PRIVATE_KEY,
  publicKey: "ssh-ed25519 AAAA deploy",
}

/** The credential as the handler reads it back: no private key column. */
function publicRow() {
  const { privateKey: _, token: __, ...row } = credentialRow()
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

/** A column a write sent, or "" when it sent none. */
function written(values: unknown, column: string): string {
  const value =
    typeof values === "object" && values !== null
      ? Reflect.get(values, column)
      : undefined
  return typeof value === "string" ? value : ""
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
    fakeDb.queue("select", [{ type: "ssh_key" }])
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
    fakeDb.queue("select", [{ type: "ssh_key" }])
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
    fakeDb.queue("select", [])

    await expectErrorCode(
      credentialsHandler.update({
        context,
        input: { id: IDS.credential, name: "x", username: "y" },
      }),
      "NOT_FOUND"
    )
  })
})

describe("token credentials", () => {
  const TOKEN_INPUT = {
    type: "token" as const,
    scope: "git" as const,
    name: "github",
    username: "octocat",
    token: TOKEN,
  }
  const tokenRow = () => credentialRow({ type: "token", token: "v1:enc" })

  test("create stores the token encrypted, with no key pair, and never returns it", async () => {
    fakeDb.queue("insert", [{ ...publicRow(), type: "token", publicKey: null }])

    const result = await credentialsHandler.create({
      context,
      input: TOKEN_INPUT,
    })

    expect(result).not.toHaveProperty("token")
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    const [values] = stepArgs(insert, "values")
    expect(values).toMatchObject({ type: "token", username: "octocat" })
    expect(values).not.toHaveProperty("privateKey")
    expect(values).not.toHaveProperty("publicKey")
    const stored = written(values, "token")
    expect(stored).toStartWith("v1:")
    expect(stored).not.toContain(TOKEN)
    expect(decryptSecret(stored)).toBe(TOKEN)
    expect(selectedColumns(stepArgs(insert, "returning"))).not.toContain(
      "token"
    )
  })

  test("without a username the token one is x-access-token", async () => {
    fakeDb.queue("insert", [tokenRow()])

    await call(
      credentialsRouter.create,
      { type: "token", name: "github", token: TOKEN },
      { context }
    )

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      username: "x-access-token",
    })
  })

  test("an SSH key can be created for Git, a token never for a host", async () => {
    fakeDb.queue("insert", [publicRow()])
    await call(
      credentialsRouter.create,
      { ...INPUT, scope: "git" },
      { context }
    )
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      type: "ssh_key",
      scope: "git",
    })

    await expectErrorCode(
      call(
        credentialsRouter.create,
        // Not a shape the types allow, as a raw client could send it.
        JSON.parse(JSON.stringify({ ...TOKEN_INPUT, scope: "host" })),
        { context }
      ),
      "BAD_REQUEST"
    )
  })

  test("a token is always a Git credential", async () => {
    fakeDb.queue("insert", [tokenRow()])

    await credentialsHandler.create({ context, input: TOKEN_INPUT })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({ scope: "git" })
  })

  test("a create from an older client, with no type, is an SSH key", async () => {
    fakeDb.queue("insert", [publicRow()])
    const { type: _, ...legacy } = INPUT

    await call(credentialsRouter.create, legacy, { context })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      type: "ssh_key",
      scope: "host",
    })
  })

  test("an empty token is BAD_REQUEST and nothing is written", async () => {
    await expectErrorCode(
      call(
        credentialsRouter.create,
        { ...TOKEN_INPUT, token: "  " },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("the procedure output exposes the type, never the token", async () => {
    fakeDb.queue("select", [tokenRow()])

    const [listed] = await call(credentialsRouter.list, undefined, { context })

    expect(listed).toMatchObject({ type: "token" })
    expect(listed).not.toHaveProperty("token")
  })

  test("update re-encrypts a new token and keeps it when omitted", async () => {
    fakeDb.queue("select", [{ type: "token" }])
    fakeDb.queue("update", [publicRow()])
    await credentialsHandler.update({
      context,
      input: { id: IDS.credential, name: "gh", username: "me", token: TOKEN },
    })
    fakeDb.queue("select", [{ type: "token" }])
    fakeDb.queue("update", [publicRow()])
    await credentialsHandler.update({
      context,
      input: { id: IDS.credential, name: "gh", username: "me" },
    })

    const [withToken, without] = fakeDb.calls("update")
    if (!withToken || !without) throw new Error("updates not recorded")
    expect(decryptSecret(written(stepArgs(withToken, "set")[0], "token"))).toBe(
      TOKEN
    )
    expect(stepArgs(without, "set")[0]).not.toHaveProperty("token")
  })

  test("a key on a token credential, or a token on an SSH one, is BAD_REQUEST", async () => {
    fakeDb.queue("select", [{ type: "token" }])
    await expectErrorCode(
      credentialsHandler.update({
        context,
        input: {
          id: IDS.credential,
          name: "x",
          username: "y",
          privateKey: "k",
        },
      }),
      "BAD_REQUEST"
    )
    fakeDb.queue("select", [{ type: "ssh_key" }])
    await expectErrorCode(
      credentialsHandler.update({
        context,
        input: { id: IDS.credential, name: "x", username: "y", token: TOKEN },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
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
