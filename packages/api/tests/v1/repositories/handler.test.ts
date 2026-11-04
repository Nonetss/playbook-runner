import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { playbookRepositories } from "@playbook-runner/db/schema/playbook-repositories"
import {
  IDS,
  playbookRow,
  repositoryRow,
  stepArgs,
} from "@playbook-runner/db/testing"
import { DeleteRepositoryResponse } from "@playbook-runner/grpc/stubs"
import { QueryBuilder } from "drizzle-orm/pg-core"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { grpc, grpcError, resetGrpc } from "#tests/fixtures/grpc"
import { decryptSecret, encryptSecret } from "#v1/credentials/crypto"
import { repositoriesHandler } from "#v1/repositories/handler"
import { repositoriesRouter } from "#v1/repositories/router"

const context = userContext()
const PASSWORD = "correct-horse-battery"
const REPOSITORY = {
  name: "infra",
  url: "https://git.example.com/infra.git",
  branch: "main",
}

/** A repository as the API returns it. */
function repositoryOutput() {
  const { vaultPassword: _, ...row } = repositoryRow()
  return { ...row, hasVaultPassword: false }
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

describe("repositories.create", () => {
  test("inserts the repository without a credential lookup when none is given", async () => {
    fakeDb.queue("insert", [repositoryRow()])

    expect(
      await repositoriesHandler.create({ context, input: REPOSITORY })
    ).toEqual(repositoryOutput())
    expect(fakeDb.calls("select")).toEqual([])
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([REPOSITORY])
  })

  test("a missing credential is BAD_REQUEST and nothing is written", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      repositoriesHandler.create({
        context,
        input: { ...REPOSITORY, credentialId: IDS.credential },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("an existing credential is accepted", async () => {
    fakeDb.queue("select", [{ id: IDS.credential }])
    fakeDb.queue("insert", [repositoryRow({ credentialId: IDS.credential })])

    await repositoriesHandler.create({
      context,
      input: { ...REPOSITORY, credentialId: IDS.credential },
    })

    expect(fakeDb.calls("insert")).toHaveLength(1)
  })

  for (const url of ["file:///srv/repo", "/srv/repo", "http://git.local/x"]) {
    test(`the URL ${url} is BAD_REQUEST and nothing is written`, async () => {
      await expectErrorCode(
        call(repositoriesRouter.create, { ...REPOSITORY, url }, { context }),
        "BAD_REQUEST"
      )
      expect(fakeDb.calls()).toEqual([])
    })
  }

  test("a subdirectory escaping the repository is BAD_REQUEST", async () => {
    await expectErrorCode(
      call(
        repositoriesRouter.create,
        { ...REPOSITORY, subdir: "playbooks/../../etc" },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      repositoriesHandler.create({ context, input: REPOSITORY }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("repositories.list", () => {
  test("returns the repositories with their playbook counts", async () => {
    fakeDb.queue("select", [{ ...repositoryRow(), playbookCount: 3 }])

    expect(await repositoriesHandler.list({ context })).toEqual([
      { ...repositoryOutput(), playbookCount: 3 },
    ])
  })

  test("counts each repository's playbooks with qualified columns", async () => {
    fakeDb.queue("select", [])

    await repositoriesHandler.list({ context })

    // A single-table select strips the table from top-level columns, and inside
    // this subquery both would then resolve to `playbooks`.
    const [select] = fakeDb.calls("select")
    if (!select) throw new Error("expected a select")
    const [fields] = stepArgs(select, "select")
    const { sql } = new QueryBuilder()
      .select(fields as Parameters<QueryBuilder["select"]>[0])
      .from(playbookRepositories)
      .toSQL()
    expect(sql).toContain(
      '"playbooks"."repository_id" = "playbook_repositories"."id"'
    )
  })
})

describe("repositories.get", () => {
  test("returns the repository", async () => {
    fakeDb.queue("select", [repositoryRow()])

    expect(
      await repositoriesHandler.get({ context, input: { id: IDS.repository } })
    ).toEqual(repositoryOutput())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      repositoriesHandler.get({ context, input: { id: IDS.repository } }),
      "NOT_FOUND"
    )
  })
})

describe("repositories.update", () => {
  test("writes the new values and updatedAt, never the id", async () => {
    fakeDb.queue("update", [repositoryRow({ branch: "release" })])

    await repositoriesHandler.update({
      context,
      input: { ...REPOSITORY, id: IDS.repository, branch: "release" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ ...REPOSITORY, branch: "release" })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("a missing credential is BAD_REQUEST and nothing is written", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      repositoriesHandler.update({
        context,
        input: {
          ...REPOSITORY,
          id: IDS.repository,
          credentialId: IDS.credential,
        },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      repositoriesHandler.update({
        context,
        input: { ...REPOSITORY, id: IDS.repository },
      }),
      "NOT_FOUND"
    )
  })
})

describe("repositories.delete", () => {
  test("deletes the repository and asks the runner to drop its mirror", async () => {
    fakeDb.queue("delete", [repositoryRow()])
    grpc.unary.mockResolvedValue(DeleteRepositoryResponse.fromPartial({}))

    expect(
      await repositoriesHandler.delete({
        context,
        input: { id: IDS.repository },
      })
    ).toEqual(repositoryOutput())
    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({
      repository_id: IDS.repository,
    })
  })

  test("a mirror that cannot be dropped does not fail the delete", async () => {
    fakeDb.queue("delete", [repositoryRow()])
    grpc.unary.mockRejectedValue(grpcError(14))

    expect(
      await repositoriesHandler.delete({
        context,
        input: { id: IDS.repository },
      })
    ).toEqual(repositoryOutput())
  })

  test("without a service token the mirror is left alone", async () => {
    testEnv.SERVICE_TOKEN = undefined
    fakeDb.queue("delete", [repositoryRow()])

    await repositoriesHandler.delete({ context, input: { id: IDS.repository } })

    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("an unknown id is NOT_FOUND and the runner is not called", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      repositoriesHandler.delete({ context, input: { id: IDS.repository } }),
      "NOT_FOUND"
    )
    expect(grpc.unary).not.toHaveBeenCalled()
  })
})

describe("the Vault password", () => {
  const STORED = encryptSecret(PASSWORD)

  /** The values written by the only update recorded. */
  function updatedValues() {
    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    return stepArgs(update, "set")[0]
  }

  test("create stores it encrypted and returns only that there is one", async () => {
    fakeDb.queue("insert", [repositoryRow({ vaultPassword: STORED })])

    const output = await repositoriesHandler.create({
      context,
      input: { ...REPOSITORY, vaultPassword: PASSWORD },
    })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    const [values] = stepArgs(insert, "values") as [{ vaultPassword: string }]
    expect(values.vaultPassword).toStartWith("v1:")
    expect(decryptSecret(values.vaultPassword)).toBe(PASSWORD)
    expect(output.hasVaultPassword).toBe(true)
    expect(output).not.toHaveProperty("vaultPassword")
  })

  test("an update that omits it leaves the stored one alone", async () => {
    fakeDb.queue("update", [repositoryRow({ vaultPassword: STORED })])

    const output = await repositoriesHandler.update({
      context,
      input: { ...REPOSITORY, id: IDS.repository },
    })

    expect(updatedValues()).not.toHaveProperty("vaultPassword")
    expect(output.hasVaultPassword).toBe(true)
  })

  test("an update with a new one replaces it, encrypted", async () => {
    fakeDb.queue("update", [repositoryRow({ vaultPassword: STORED })])

    await repositoriesHandler.update({
      context,
      input: { ...REPOSITORY, id: IDS.repository, vaultPassword: "otra" },
    })

    const { vaultPassword } = updatedValues() as { vaultPassword: string }
    expect(decryptSecret(vaultPassword)).toBe("otra")
  })

  test("an update with null removes it", async () => {
    fakeDb.queue("update", [repositoryRow()])

    const output = await repositoriesHandler.update({
      context,
      input: { ...REPOSITORY, id: IDS.repository, vaultPassword: null },
    })

    expect(updatedValues()).toHaveProperty("vaultPassword", null)
    expect(output.hasVaultPassword).toBe(false)
  })

  for (const vaultPassword of ["", " padded", "padded ", "padded\n"]) {
    test(`${JSON.stringify(vaultPassword)} is BAD_REQUEST and nothing is written`, async () => {
      await expectErrorCode(
        call(
          repositoriesRouter.create,
          { ...REPOSITORY, vaultPassword },
          { context }
        ),
        "BAD_REQUEST"
      )
      expect(fakeDb.calls()).toEqual([])
    })
  }

  test("no procedure returns it or its encrypted form", async () => {
    const row = repositoryRow({ vaultPassword: STORED })
    fakeDb.queue("select", [{ ...row, playbookCount: 0 }], [row])
    fakeDb.queue("delete", [row])
    grpc.unary.mockResolvedValue(DeleteRepositoryResponse.fromPartial({}))
    const input = { id: IDS.repository }

    const outputs = [
      await call(repositoriesRouter.list, undefined, { context }),
      await call(repositoriesRouter.get, input, { context }),
      await call(repositoriesRouter.delete, input, { context }),
    ]

    expect(JSON.stringify(outputs)).not.toContain(STORED)
    expect(JSON.stringify(outputs)).not.toContain("vaultPassword")
    expect(outputs[1]).toHaveProperty("hasVaultPassword", true)
  })
})

describe("repositories.playbooks", () => {
  test("returns the repository's playbooks", async () => {
    const rows = [
      playbookRow({ source: "git", repositoryId: IDS.repository, path: "a" }),
    ]
    fakeDb.queue("select", [repositoryRow()], rows)

    expect(
      await repositoriesHandler.playbooks({
        context,
        input: { id: IDS.repository },
      })
    ).toEqual(rows)
  })

  test("an unknown repository is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      repositoriesHandler.playbooks({
        context,
        input: { id: IDS.repository },
      }),
      "NOT_FOUND"
    )
  })
})

describe("repositories.roles", () => {
  test("an unknown repository is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      repositoriesHandler.roles({ context, input: { id: IDS.repository } }),
      "NOT_FOUND"
    )
  })

  test("a malformed id is BAD_REQUEST", async () => {
    await expectErrorCode(
      call(repositoriesRouter.roles, { id: "nope" }, { context }),
      "BAD_REQUEST"
    )
  })

  test("the output keeps a never-synced repository's empty list", async () => {
    fakeDb.queue("select", [{ ...repositoryRow(), privateKey: null }])

    expect(
      await call(repositoriesRouter.roles, { id: IDS.repository }, { context })
    ).toEqual({
      commit: null,
      roles: [],
      requirementsFiles: [],
      playbookRoles: [],
      playbookVariables: [],
    })
  })
})
