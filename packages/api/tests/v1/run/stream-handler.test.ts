import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { IDS, playbookRow, scriptRow } from "@playbook-runner/db/testing"
import { grpcStatus } from "@playbook-runner/grpc"
import { RunBundleResponse } from "@playbook-runner/grpc/stubs"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  controlledStream,
  grpc,
  grpcError,
  resetGrpc,
  streamOf,
} from "#tests/fixtures/grpc"
import { encryptSecret } from "#v1/credentials/crypto"
import { runRouter } from "#v1/run/router"
import { streamHandler } from "#v1/run/stream-handler"

const context = userContext()
const KEY = "-----BEGIN OPENSSH PRIVATE KEY-----\nhost\n"
const DEVICE = [{ type: "device" as const, id: IDS.device }]

const HOST_ROW = {
  deviceId: IDS.device,
  deviceName: "web-1",
  ipAddress: "10.0.0.10/32",
  portSSH: 22,
  credentialId: IDS.credential,
  username: "ansible",
  privateKey: encryptSecret(KEY),
}

const TASK = RunBundleResponse.fromPartial({
  task: { event: "runner_on_ok", host: "web-1", task: "ping" },
})
const HEARTBEAT = RunBundleResponse.fromPartial({ heartbeat: {} })
const DONE = RunBundleResponse.fromPartial({
  done: { status: "successful", rc: 0, ok: true },
})

/** Every record a run stream yields, plus the terminal value it returns. */
async function drain<T, R>(stream: AsyncGenerator<T, R, void>) {
  const records: T[] = []
  for (;;) {
    const next = await stream.next()
    if (next.done) return { records, done: next.value }
    records.push(next.value)
  }
}

/** Queues what each handler reads before it opens the stream. */
const resolves = {
  ping: () => fakeDb.queue("select", [HOST_ROW]),
  run: () => {
    const { id, name, content, source, path, missing, repositoryId } =
      playbookRow()
    fakeDb.queue(
      "select",
      [{ id, name, content, source, path, missing, repositoryId }],
      [HOST_ROW]
    )
  },
  command: () => fakeDb.queue("select", [HOST_ROW]),
  script: () => {
    const { id, name, content, language } = scriptRow()
    fakeDb.queue("select", [{ id, name, content, language }], [HOST_ROW])
  },
}

/** Opens each kind of interactive run with a valid input. */
const opens = {
  ping: () => streamHandler.ping({ context, input: { deviceId: IDS.device } }),
  run: () =>
    streamHandler.run({
      context,
      input: {
        playbookId: IDS.playbook,
        inventory: DEVICE,
        forks: 1,
        extravars: {},
      },
    }),
  command: () =>
    streamHandler.command({
      context,
      input: {
        inventory: DEVICE,
        command: "uptime",
        module: "shell",
        become: false,
        forks: 1,
      },
    }),
  script: () =>
    streamHandler.script({
      context,
      input: {
        scriptId: IDS.script,
        inventory: DEVICE,
        become: false,
        forks: 1,
      },
    }),
}

const KINDS = ["ping", "run", "command", "script"] as const

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

for (const kind of KINDS) {
  describe(`run.${kind}`, () => {
    test("without a service token it is SERVICE_UNAVAILABLE before any query or call", async () => {
      testEnv.SERVICE_TOKEN = undefined

      await expectErrorCode(opens[kind]().next(), "SERVICE_UNAVAILABLE")
      expect(fakeDb.calls()).toEqual([])
      expect(grpc.serverStream).not.toHaveBeenCalled()
    })

    test("forwards the runner's events in order, drops heartbeats and returns the outcome", async () => {
      resolves[kind]()
      grpc.serverStream.mockImplementation(() =>
        streamOf([HEARTBEAT, TASK, HEARTBEAT, TASK, DONE])
      )

      const { records, done } = await drain(opens[kind]())

      expect(records).toEqual([
        { event: "runner_on_ok", host: "web-1", task: "ping" },
        { event: "runner_on_ok", host: "web-1", task: "ping" },
      ])
      expect(done).toEqual({ status: "successful", rc: 0, ok: true })
      expect(grpc.serverStream.mock.calls[0]?.[2]).toMatchObject({
        token: testEnv.SERVICE_TOKEN,
      })
    })

    test("sends the host with its decrypted key", async () => {
      resolves[kind]()
      grpc.serverStream.mockImplementation(() => streamOf([DONE]))

      await drain(opens[kind]())

      expect(JSON.stringify(grpc.serverStream.mock.calls[0]?.[1])).toContain(
        JSON.stringify(KEY)
      )
    })

    test("a runner at capacity is TOO_MANY_REQUESTS", async () => {
      resolves[kind]()
      grpc.serverStream.mockImplementation(() =>
        streamOf([], grpcError(grpcStatus.RESOURCE_EXHAUSTED))
      )

      await expectErrorCode(drain(opens[kind]()), "TOO_MANY_REQUESTS")
    })

    for (const status of [
      grpcStatus.INTERNAL,
      grpcStatus.UNAVAILABLE,
      grpcStatus.CANCELLED,
    ]) {
      test(`a stream lost with ${grpcStatus[status]} is BAD_GATEWAY saying the hosts may have kept going`, async () => {
        resolves[kind]()
        grpc.serverStream.mockImplementation(() =>
          streamOf([TASK], grpcError(status, "stream reset"))
        )

        const error = await expectErrorCode(drain(opens[kind]()), "BAD_GATEWAY")

        expect(error?.message).toContain("pudo continuar")
      })
    }

    test("stopping the consumer cancels the runner stream", async () => {
      resolves[kind]()
      const runner = controlledStream<RunBundleResponse>()
      grpc.serverStream.mockImplementation(() => runner.stream())
      const stream = opens[kind]()

      runner.push(TASK)
      await stream.next()
      await stream.return({ status: "cancelled", rc: -1, ok: false })

      expect(runner.cancelled).toBe(true)
    })
  })
}

describe("run resolution errors", () => {
  test("an unknown device to ping is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(opens.ping().next(), "NOT_FOUND")
    expect(grpc.serverStream).not.toHaveBeenCalled()
  })

  test("a selection that reaches no device is BAD_REQUEST", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      streamHandler
        .command({
          context,
          input: {
            inventory: [{ type: "group", id: IDS.group }],
            command: "uptime",
            module: "shell",
            become: false,
            forks: 1,
          },
        })
        .next(),
      "BAD_REQUEST"
    )
  })

  test("a device without a credential is PRECONDITION_FAILED", async () => {
    fakeDb.queue("select", [
      { ...HOST_ROW, credentialId: null, username: null, privateKey: null },
    ])

    await expectErrorCode(opens.ping().next(), "PRECONDITION_FAILED")
  })

  test("an unsynced Git playbook is PRECONDITION_FAILED", async () => {
    const { id, name, content, path, missing } = playbookRow({
      path: "site.yml",
    })
    fakeDb.queue(
      "select",
      [
        {
          id,
          name,
          content,
          source: "git",
          path,
          missing,
          repositoryId: IDS.repository,
        },
      ],
      [{ id: IDS.repository, url: "https://x/y.git", lastCommitSha: null }]
    )

    await expectErrorCode(opens.run().next(), "PRECONDITION_FAILED")
  })
})

describe("run input", () => {
  test("a reserved extra var is BAD_REQUEST before anything runs", async () => {
    await expectErrorCode(
      call(
        runRouter.run,
        {
          playbookId: IDS.playbook,
          inventory: DEVICE,
          extravars: { ANSIBLE_ssh_common_args: "-o ProxyCommand=evil" },
        },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
    expect(grpc.serverStream).not.toHaveBeenCalled()
  })

  test("more than 50 forks is BAD_REQUEST", async () => {
    await expectErrorCode(
      call(
        runRouter.command,
        { inventory: DEVICE, command: "uptime", forks: 51 },
        { context }
      ),
      "BAD_REQUEST"
    )
  })
})
