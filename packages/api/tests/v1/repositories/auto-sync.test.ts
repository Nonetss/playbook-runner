import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, repositoryRow, stepArgs } from "@playbook-runner/db/testing"
import { grpcStatus } from "@playbook-runner/grpc"
import { SyncRepositoryResponse } from "@playbook-runner/grpc/stubs"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { grpc, grpcError, resetGrpc } from "#tests/fixtures/grpc"
import {
  repositorySyncPattern,
  syncAllRepositories,
} from "#v1/repositories/auto-sync"

const OTHER_REPOSITORY = "00000000-0000-4000-8000-0000000000aa"
const COMMIT = "0123456789abcdef0123456789abcdef01234567"

/** The row `syncRepository` reads: the repository joined with its key. */
function repositoryWithKey(id: string) {
  const { url, branch, subdir } = repositoryRow()
  return { id, url, branch, subdir, privateKey: null }
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

describe("repositorySyncPattern", () => {
  test("keeps a valid expression, trimmed", () => {
    expect(repositorySyncPattern(" 0 * * * * ")).toBe("0 * * * *")
    expect(repositorySyncPattern("@hourly")).toBe("@hourly")
  })

  test('"off" disables the sync', () => {
    expect(repositorySyncPattern("off")).toBeNull()
  })

  test("an invalid expression throws instead of never syncing", () => {
    expect(() => repositorySyncPattern("every hour")).toThrow(
      /REPOSITORY_SYNC_CRON/
    )
  })
})

describe("syncAllRepositories", () => {
  test("without a service token it reads and calls nothing", async () => {
    testEnv.SERVICE_TOKEN = undefined

    expect(await syncAllRepositories()).toEqual({ synced: 0, failed: 0 })
    expect(fakeDb.calls()).toEqual([])
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("syncs every repository one by one and a failure does not stop the next", async () => {
    fakeDb.queue(
      "select",
      [
        { id: IDS.repository, name: "a" },
        { id: OTHER_REPOSITORY, name: "b" },
      ],
      [repositoryWithKey(IDS.repository)],
      [repositoryWithKey(OTHER_REPOSITORY)],
      []
    )
    fakeDb.queue("delete", [])
    fakeDb.queue(
      "update",
      [],
      [],
      [repositoryRow({ id: OTHER_REPOSITORY, lastCommitSha: COMMIT })]
    )
    let calls = 0
    grpc.unary.mockImplementation(async () => {
      calls++
      if (calls === 1) throw grpcError(grpcStatus.UNAVAILABLE, "down")
      return SyncRepositoryResponse.fromPartial({ commit: COMMIT })
    })

    expect(await syncAllRepositories()).toEqual({ synced: 1, failed: 1 })

    expect(grpc.unary).toHaveBeenCalledTimes(2)
    expect(grpc.unary.mock.calls[0]?.[1]).toMatchObject({
      repository_id: IDS.repository,
    })
    expect(grpc.unary.mock.calls[1]?.[1]).toMatchObject({
      repository_id: OTHER_REPOSITORY,
    })
    const [failure] = fakeDb.calls("update")
    if (!failure) throw new Error("no update recorded")
    expect(stepArgs(failure, "set")[0]).toMatchObject({ lastSyncError: "down" })
  })
})
