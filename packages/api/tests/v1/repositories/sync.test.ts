import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, repositoryRow, stepArgs } from "@playbook-runner/db/testing"
import { grpcStatus } from "@playbook-runner/grpc"
import {
  ListBranchesResponse,
  SyncRepositoryResponse,
} from "@playbook-runner/grpc/stubs"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { grpc, grpcError, resetGrpc } from "#tests/fixtures/grpc"
import { encryptSecret } from "#v1/credentials/crypto"
import { listRemoteBranches, syncRepository } from "#v1/repositories/sync"

const COMMIT = "0123456789abcdef0123456789abcdef01234567"
const KEY = "-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n"

/** The row `syncRepository` reads: the repository joined with its key. */
function repositoryWithKey(privateKey: string | null = null) {
  const { id, url, branch, subdir } = repositoryRow()
  return { id, url, branch, subdir, privateKey }
}

/** Queues the reads and writes of a successful sync, in await order. */
function queueSuccessfulSync(options: {
  known: string[]
  removed?: number
  missing?: number
}) {
  fakeDb.queue(
    "select",
    [repositoryWithKey()],
    options.known.map((path) => ({ path }))
  )
  fakeDb.queue("insert", undefined, undefined, undefined)
  fakeDb.queue(
    "delete",
    Array.from({ length: options.removed ?? 0 }, () => ({ id: IDS.playbook }))
  )
  fakeDb.queue(
    "update",
    Array.from({ length: options.missing ?? 0 }, () => ({ id: IDS.playbook })),
    [repositoryRow({ lastCommitSha: COMMIT })]
  )
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

describe("syncRepository", () => {
  test("an unknown repository is NOT_FOUND and the runner is not called", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(syncRepository(IDS.repository), "NOT_FOUND")
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("without a service token it is SERVICE_UNAVAILABLE before any query or call", async () => {
    testEnv.SERVICE_TOKEN = undefined

    await expectErrorCode(syncRepository(IDS.repository), "SERVICE_UNAVAILABLE")
    expect(fakeDb.calls()).toEqual([])
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("sends the repository and its decrypted deploy key", async () => {
    fakeDb.queue("select", [repositoryWithKey(encryptSecret(KEY))])
    fakeDb.queue("update", [])
    grpc.unary.mockRejectedValue(grpcError(grpcStatus.UNAVAILABLE))

    await syncRepository(IDS.repository).catch(() => undefined)

    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({
      repository_id: IDS.repository,
      url: "https://git.example.com/infra.git",
      branch: "main",
      subdir: "",
      private_key: KEY,
    })
    expect(grpc.unary.mock.calls[0]?.[2]).toMatchObject({
      token: testEnv.SERVICE_TOKEN,
    })
  })

  const failures = [
    [grpcStatus.INVALID_ARGUMENT, "BAD_REQUEST"],
    [grpcStatus.NOT_FOUND, "BAD_REQUEST"],
    [grpcStatus.RESOURCE_EXHAUSTED, "TOO_MANY_REQUESTS"],
    [grpcStatus.UNAVAILABLE, "BAD_GATEWAY"],
    [grpcStatus.INTERNAL, "BAD_GATEWAY"],
  ] as const

  for (const [status, code] of failures) {
    test(`a gRPC ${grpcStatus[status]} is ${code} and the error is recorded`, async () => {
      fakeDb.queue("select", [repositoryWithKey()])
      fakeDb.queue("update", [])
      grpc.unary.mockRejectedValue(grpcError(status, "remote said no"))

      const error = await expectErrorCode(syncRepository(IDS.repository), code)

      expect(error?.message).toBe("remote said no")
      const [update] = fakeDb.calls("update")
      if (!update) throw new Error("no update recorded")
      expect(stepArgs(update, "set")[0]).toMatchObject({
        lastSyncError: "remote said no",
      })
      expect(fakeDb.calls("transaction")).toEqual([])
    })
  }

  test("a non-gRPC failure is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("select", [repositoryWithKey()])
    fakeDb.queue("update", [])
    grpc.unary.mockRejectedValue(new Error("socket hang up"))

    await expectErrorCode(
      syncRepository(IDS.repository),
      "INTERNAL_SERVER_ERROR"
    )
  })

  test("upserts each discovered file as a Git playbook inside a transaction", async () => {
    grpc.unary.mockResolvedValue(
      SyncRepositoryResponse.fromPartial({
        commit: COMMIT,
        playbooks: [
          { path: "site.yml", content: "a" },
          { path: "db.yml", content: "b" },
          { path: "web/new.yml", content: "c" },
        ],
      })
    )
    queueSuccessfulSync({ known: ["site.yml", "db.yml"], removed: 1 })

    const result = await syncRepository(IDS.repository)

    expect(result).toEqual({
      repository: repositoryRow({ lastCommitSha: COMMIT }),
      added: 1,
      updated: 2,
      missing: 0,
      removed: 1,
    })
    const inserts = fakeDb.calls("insert")
    expect(inserts.map((call) => stepArgs(call, "values")[0])).toEqual([
      {
        name: "site.yml",
        content: "a",
        source: "git",
        repositoryId: IDS.repository,
        path: "site.yml",
      },
      {
        name: "db.yml",
        content: "b",
        source: "git",
        repositoryId: IDS.repository,
        path: "db.yml",
      },
      {
        name: "web/new.yml",
        content: "c",
        source: "git",
        repositoryId: IDS.repository,
        path: "web/new.yml",
      },
    ])
    expect(fakeDb.calls().map((call) => call.op)).toEqual([
      "select",
      "transaction",
      "select",
      "insert",
      "insert",
      "insert",
      "delete",
      "update",
      "update",
    ])
  })

  test("vanished files still used by a job are flagged missing", async () => {
    grpc.unary.mockResolvedValue(
      SyncRepositoryResponse.fromPartial({ commit: COMMIT, playbooks: [] })
    )
    fakeDb.queue("select", [repositoryWithKey()], [{ path: "gone.yml" }])
    fakeDb.queue("delete", [])
    fakeDb.queue(
      "update",
      [{ id: IDS.playbook }],
      [repositoryRow({ lastCommitSha: COMMIT })]
    )

    const result = await syncRepository(IDS.repository)

    expect(result).toMatchObject({ added: 0, updated: 0, missing: 1 })
    const [flag] = fakeDb.calls("update")
    if (!flag) throw new Error("no update recorded")
    expect(stepArgs(flag, "set")[0]).toMatchObject({ missing: true })
  })

  test("records the synced commit and clears the last error", async () => {
    grpc.unary.mockResolvedValue(
      SyncRepositoryResponse.fromPartial({
        commit: COMMIT,
        playbooks: [{ path: "site.yml", content: "a" }],
      })
    )
    fakeDb.queue("select", [repositoryWithKey()], [])
    fakeDb.queue("insert", undefined)
    fakeDb.queue("delete", [])
    fakeDb.queue("update", [], [repositoryRow({ lastCommitSha: COMMIT })])

    await syncRepository(IDS.repository)

    const repositoryUpdate = fakeDb.calls("update").at(-1)
    if (!repositoryUpdate) throw new Error("no update recorded")
    expect(stepArgs(repositoryUpdate, "set")[0]).toMatchObject({
      lastCommitSha: COMMIT,
      lastSyncedAt: expect.any(Date),
      lastSyncError: null,
    })
  })
})

describe("listRemoteBranches", () => {
  test("returns the branches and the default one", async () => {
    grpc.unary.mockResolvedValue(
      ListBranchesResponse.fromPartial({
        branches: ["main", "release"],
        default_branch: "main",
      })
    )

    expect(
      await listRemoteBranches("https://git.example.com/infra.git", null)
    ).toEqual({ branches: ["main", "release"], defaultBranch: "main" })
    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({
      url: "https://git.example.com/infra.git",
      private_key: undefined,
    })
  })

  test("an unknown remote HEAD becomes a null default branch", async () => {
    grpc.unary.mockResolvedValue(
      ListBranchesResponse.fromPartial({
        branches: ["dev"],
        default_branch: "",
      })
    )

    expect(
      await listRemoteBranches("https://git.example.com/infra.git", null)
    ).toEqual({ branches: ["dev"], defaultBranch: null })
  })

  test("sends the credential's decrypted key", async () => {
    fakeDb.queue("select", [{ privateKey: encryptSecret(KEY) }])
    grpc.unary.mockResolvedValue(ListBranchesResponse.fromPartial({}))

    await listRemoteBranches("git@git.example.com:infra.git", IDS.credential)

    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({
      url: "git@git.example.com:infra.git",
      private_key: KEY,
    })
  })

  test("a missing credential is BAD_REQUEST and the runner is not called", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      listRemoteBranches("https://git.example.com/x.git", IDS.credential),
      "BAD_REQUEST"
    )
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("without a service token it is SERVICE_UNAVAILABLE before any query or call", async () => {
    testEnv.SERVICE_TOKEN = undefined

    await expectErrorCode(
      listRemoteBranches("https://git.example.com/x.git", IDS.credential),
      "SERVICE_UNAVAILABLE"
    )
    expect(fakeDb.calls()).toEqual([])
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("an unreachable remote is BAD_GATEWAY", async () => {
    grpc.unary.mockRejectedValue(grpcError(grpcStatus.UNAVAILABLE, "down"))

    await expectErrorCode(
      listRemoteBranches("https://git.example.com/x.git", null),
      "BAD_GATEWAY"
    )
  })
})
