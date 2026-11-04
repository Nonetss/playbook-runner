import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, playbookRow } from "@playbook-runner/db/testing"
import { ListPlaybookVariablesResponse } from "@playbook-runner/grpc/stubs"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { grpc, grpcError, resetGrpc } from "#tests/fixtures/grpc"
import { playbooksHandler } from "#v1/playbooks/handler"

const context = userContext()
const input = { id: IDS.playbook }
const inline = { source: "inline", content: "- hosts: all\n" }

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

describe("playbooks.variables", () => {
  test("asks the runner about the playbook's content", async () => {
    const { content } = playbookRow()
    fakeDb.queue("select", [{ source: "inline", content }])
    grpc.unary.mockResolvedValue(
      ListPlaybookVariablesResponse.fromPartial({
        variables: [{ name: "port", value: "80" }, { name: "db_password" }],
      })
    )

    expect(await playbooksHandler.variables({ context, input })).toEqual({
      variables: [
        { name: "port", value: "80", role: null },
        { name: "db_password", value: null, role: null },
      ],
    })
    expect(grpc.unary.mock.calls[0]?.[1]).toEqual({ content })
  })

  test("a Git playbook has none here: they come with its repository", async () => {
    fakeDb.queue("select", [{ source: "git", content: "" }])

    expect(await playbooksHandler.variables({ context, input })).toEqual({
      variables: [],
    })
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("a missing playbook is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      playbooksHandler.variables({ context, input }),
      "NOT_FOUND"
    )
    expect(grpc.unary).not.toHaveBeenCalled()
  })

  test("an unreachable runner is BAD_GATEWAY", async () => {
    fakeDb.queue("select", [inline])
    grpc.unary.mockRejectedValue(grpcError(14, "down"))

    await expectErrorCode(
      playbooksHandler.variables({ context, input }),
      "BAD_GATEWAY"
    )
  })

  test("without a service token nothing is asked", async () => {
    fakeDb.queue("select", [inline])
    testEnv.SERVICE_TOKEN = undefined

    await expect(
      playbooksHandler.variables({ context, input })
    ).rejects.toThrow()
    expect(grpc.unary).not.toHaveBeenCalled()
  })
})
