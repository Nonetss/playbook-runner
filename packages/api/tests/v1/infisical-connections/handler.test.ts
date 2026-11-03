import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import {
  IDS,
  infisicalConnectionRow,
  jobRow,
  stepArgs,
} from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { grpc, grpcError, resetGrpc } from "#tests/fixtures/grpc"
import { decryptSecret, encryptSecret } from "#v1/credentials/crypto"
import { infisicalConnectionsHandler } from "#v1/infisical-connections/handler"
import { infisicalConnectionsRouter } from "#v1/infisical-connections/router"

const context = userContext()
const SECRET = "the-client-secret"
const INPUT = {
  name: "production",
  url: "https://app.infisical.com",
  clientId: "client-id",
  clientSecret: SECRET,
  projectId: "project-id",
}

/** The connection as the handler reads it back: no client secret column. */
function publicRow() {
  const { clientSecret: _, ...row } = infisicalConnectionRow()
  return row
}

/** The `clientSecret` a write sent, or "" when it sent none. */
function writtenSecret(values: unknown): string {
  const secret =
    typeof values === "object" && values !== null
      ? Reflect.get(values, "clientSecret")
      : undefined
  return typeof secret === "string" ? secret : ""
}

/** The column names a `select(...)`/`returning(...)` step asked for. */
function selectedColumns(args: unknown[]): string[] {
  const [columns] = args
  return typeof columns === "object" && columns !== null
    ? Object.keys(columns)
    : []
}

beforeEach(() => {
  fakeDb.reset()
  resetGrpc()
  resetEnv()
})

describe("infisicalConnections.create", () => {
  test("stores the secret encrypted and never reads it back", async () => {
    fakeDb.queue("insert", [publicRow()])

    const result = await infisicalConnectionsHandler.create({
      context,
      input: INPUT,
    })

    expect(result).not.toHaveProperty("clientSecret")
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    const [values] = stepArgs(insert, "values")
    const stored = writtenSecret(values)
    expect(stored).toStartWith("v1:")
    expect(stored).not.toContain(SECRET)
    expect(decryptSecret(stored)).toBe(SECRET)
    expect(selectedColumns(stepArgs(insert, "returning"))).not.toContain(
      "clientSecret"
    )
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      infisicalConnectionsHandler.create({ context, input: INPUT }),
      "INTERNAL_SERVER_ERROR"
    )
  })

  test.each([
    ["a non-http scheme", { url: "ftp://infisical.example.com" }],
    ["a value that is not a URL", { url: "infisical" }],
    ["an empty name", { name: "" }],
    ["an empty client id", { clientId: "" }],
    ["an empty client secret", { clientSecret: "" }],
  ])("%s is BAD_REQUEST and writes nothing", async (_, override) => {
    await expectErrorCode(
      call(
        infisicalConnectionsRouter.create,
        { ...INPUT, ...override },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("an http URL is accepted for self-hosted instances", async () => {
    fakeDb.queue("insert", [publicRow()])

    await call(
      infisicalConnectionsRouter.create,
      { ...INPUT, url: "http://infisical.internal:8080" },
      { context }
    )

    expect(fakeDb.calls("insert")).toHaveLength(1)
  })
})

describe("infisicalConnections.list", () => {
  test("selects only the public columns", async () => {
    fakeDb.queue("select", [publicRow()])

    expect(await infisicalConnectionsHandler.list({ context })).toEqual([
      publicRow(),
    ])
    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("no select recorded")
    expect(selectedColumns(stepArgs(select, "select"))).not.toContain(
      "clientSecret"
    )
  })

  test("the procedure output drops a secret even if one is read", async () => {
    fakeDb.queue("select", [infisicalConnectionRow()])

    const [listed] = await call(infisicalConnectionsRouter.list, undefined, {
      context,
    })

    expect(listed).not.toHaveProperty("clientSecret")
  })
})

describe("infisicalConnections.get", () => {
  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      infisicalConnectionsHandler.get({
        context,
        input: { id: IDS.infisicalConnection },
      }),
      "NOT_FOUND"
    )
  })
})

describe("infisicalConnections.update", () => {
  const UPDATE = {
    id: IDS.infisicalConnection,
    name: "renamed",
    url: INPUT.url,
    clientId: INPUT.clientId,
    projectId: INPUT.projectId,
  }

  test("an omitted secret leaves the stored one untouched", async () => {
    fakeDb.queue("update", [publicRow()])

    await infisicalConnectionsHandler.update({ context, input: UPDATE })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ name: "renamed" })
    expect(values).not.toHaveProperty("clientSecret")
    expect(values).not.toHaveProperty("id")
  })

  test("a new secret is stored encrypted", async () => {
    fakeDb.queue("update", [publicRow()])

    await infisicalConnectionsHandler.update({
      context,
      input: { ...UPDATE, clientSecret: "rotated" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(decryptSecret(writtenSecret(values))).toBe("rotated")
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      infisicalConnectionsHandler.update({ context, input: UPDATE }),
      "NOT_FOUND"
    )
  })
})

describe("infisicalConnections.delete", () => {
  const input = { id: IDS.infisicalConnection }

  test("a connection used by a job is CONFLICT and is not deleted", async () => {
    fakeDb.queue("select", [{ id: jobRow().id }])

    await expectErrorCode(
      infisicalConnectionsHandler.delete({ context, input }),
      "CONFLICT"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test("a connection used by a playbook is CONFLICT and is not deleted", async () => {
    fakeDb.queue("select", [], [{ id: IDS.playbook }])

    await expectErrorCode(
      infisicalConnectionsHandler.delete({ context, input }),
      "CONFLICT"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test("a connection nothing uses is deleted", async () => {
    fakeDb.queue("select", [], [])
    fakeDb.queue("delete", [publicRow()])

    expect(
      await infisicalConnectionsHandler.delete({ context, input })
    ).toEqual(publicRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [], [])
    fakeDb.queue("delete", [])

    await expectErrorCode(
      infisicalConnectionsHandler.delete({ context, input }),
      "NOT_FOUND"
    )
  })
})

describe("infisicalConnections listings", () => {
  /** A connection as `resolveInfisicalConnection` reads it. */
  const STORED = {
    url: "https://app.infisical.com",
    clientId: "client-id",
    clientSecret: encryptSecret(SECRET),
    projectId: "project-id",
  }
  const AUTH = {
    url: "https://app.infisical.com",
    client_id: "client-id",
    client_secret: SECRET,
  }
  const id = IDS.infisicalConnection
  const names = { id, environment: "dev", secretPath: "/" }

  test("environments go through the runner with the decrypted secret", async () => {
    fakeDb.queue("select", [STORED])
    grpc.unary.mockImplementation(async () => ({
      environments: [{ slug: "dev", name: "Development" }],
    }))

    expect(
      await infisicalConnectionsHandler.environments({
        context,
        input: { id },
      })
    ).toEqual([{ slug: "dev", name: "Development" }])
    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({
      auth: AUTH,
      project_id: "project-id",
    })
  })

  test("a connection without a project has no environments and no gRPC call", async () => {
    fakeDb.queue("select", [{ ...STORED, projectId: null }])

    expect(
      await infisicalConnectionsHandler.environments({
        context,
        input: { id },
      })
    ).toEqual([])
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("secret names return names only", async () => {
    fakeDb.queue("select", [STORED])
    grpc.unary.mockImplementation(async () => ({ names: ["DB_PASSWORD"] }))

    expect(
      await infisicalConnectionsHandler.secretNames({ context, input: names })
    ).toEqual(["DB_PASSWORD"])
    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({
      auth: AUTH,
      project_id: "project-id",
      environment: "dev",
      secret_path: "/",
    })
  })

  test("the procedure output keeps only strings", async () => {
    fakeDb.queue("select", [STORED])
    grpc.unary.mockImplementation(async () => ({ names: ["DB_PASSWORD"] }))

    expect(
      await call(
        infisicalConnectionsRouter.secretNames,
        { id, environment: "dev" },
        { context }
      )
    ).toEqual(["DB_PASSWORD"])
  })

  test("secret names without a project are PRECONDITION_FAILED", async () => {
    fakeDb.queue("select", [{ ...STORED, projectId: null }])

    await expectErrorCode(
      infisicalConnectionsHandler.secretNames({ context, input: names }),
      "PRECONDITION_FAILED"
    )
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("an Infisical failure is BAD_GATEWAY with the runner's message", async () => {
    fakeDb.queue("select", [STORED])
    grpc.unary.mockImplementation(async () => {
      throw grpcError(14, "Infisical rejected the credentials")
    })

    const error = await infisicalConnectionsHandler
      .secretNames({ context, input: names })
      .catch((err: unknown) => err)

    expect(error).toMatchObject({
      code: "BAD_GATEWAY",
      message: "Infisical rejected the credentials",
    })
  })

  test("an unknown connection is NOT_FOUND", async () => {
    fakeDb.queue("select", [])
    await expectErrorCode(
      infisicalConnectionsHandler.environments({ context, input: { id } }),
      "NOT_FOUND"
    )

    fakeDb.queue("select", [])
    await expectErrorCode(
      infisicalConnectionsHandler.secretNames({ context, input: names }),
      "NOT_FOUND"
    )
  })

  test("without a service token the listing is SERVICE_UNAVAILABLE", async () => {
    testEnv.SERVICE_TOKEN = undefined

    await expectErrorCode(
      infisicalConnectionsHandler.environments({ context, input: { id } }),
      "SERVICE_UNAVAILABLE"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("an invalid environment is BAD_REQUEST before any lookup", async () => {
    await expectErrorCode(
      call(
        infisicalConnectionsRouter.secretNames,
        { id, environment: "dev/../x" },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("infisicalConnections project id", () => {
  test("create and update store it, and a missing one is BAD_REQUEST", async () => {
    fakeDb.queue("insert", [publicRow()])
    await infisicalConnectionsHandler.create({ context, input: INPUT })
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      projectId: "project-id",
    })

    fakeDb.queue("update", [publicRow()])
    await infisicalConnectionsHandler.update({
      context,
      input: { ...INPUT, id: IDS.infisicalConnection, projectId: "other" },
    })
    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toMatchObject({ projectId: "other" })

    fakeDb.reset()
    await expectErrorCode(
      call(
        infisicalConnectionsRouter.create,
        { ...INPUT, projectId: " " },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})
