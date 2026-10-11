import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import {
  IDS,
  playbookRow,
  repositoryRow,
  stepArgs,
} from "@playbook-runner/db/testing"
import { DeleteRepositoryResponse } from "@playbook-runner/grpc/stubs"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { grpc, grpcError, resetGrpc } from "#tests/fixtures/grpc"
import { repositoriesHandler } from "#v1/repositories/handler"
import { repositoriesRouter } from "#v1/repositories/router"

const context = userContext()
const REPOSITORY = {
  name: "infra",
  url: "https://git.example.com/infra.git",
  branch: "main",
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
    ).toEqual(repositoryRow())
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
    const rows = [{ ...repositoryRow(), playbookCount: 3 }]
    fakeDb.queue("select", rows)

    expect(await repositoriesHandler.list({ context })).toEqual(rows)
  })
})

describe("repositories.get", () => {
  test("returns the repository", async () => {
    fakeDb.queue("select", [repositoryRow()])

    expect(
      await repositoriesHandler.get({ context, input: { id: IDS.repository } })
    ).toEqual(repositoryRow())
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
    ).toEqual(repositoryRow())
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
    ).toEqual(repositoryRow())
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
