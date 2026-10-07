import { describe, expect, test } from "bun:test"
import { grpcStatus } from "@playbook-runner/grpc"
import type { Done, RunBundleResponse } from "@playbook-runner/grpc/stubs"
import {
  describeStreamError,
  isStreamLost,
  type RunEventRecord,
  taskEventToRecord,
  toEventIterator,
  toProtoHost,
} from "#v1/run/proto"

async function* frames(...items: RunBundleResponse[]) {
  for (const item of items) yield item
}

/** Drains the iterator, returning the yielded records and the return value. */
async function drain(iterator: AsyncGenerator<RunEventRecord, Done, void>) {
  const records: RunEventRecord[] = []
  for (;;) {
    const next = await iterator.next()
    if (next.done) return { records, done: next.value }
    records.push(next.value)
  }
}

describe("toProtoHost", () => {
  test("maps the resolved host to the proto shape", () => {
    expect(
      toProtoHost({
        name: "web-01",
        address: "10.0.0.1",
        port: 2222,
        username: "deploy",
        privateKey: "KEY",
        connection: "ssh",
      })
    ).toEqual({
      name: "web-01",
      address: "10.0.0.1",
      port: 2222,
      username: "deploy",
      private_key: "KEY",
      connection: "ssh",
    })
  })
})

describe("taskEventToRecord", () => {
  test("omits undefined fields", () => {
    expect(taskEventToRecord({ event: "playbook_on_start" })).toEqual({
      event: "playbook_on_start",
    })
  })

  test("keeps falsy values that are set", () => {
    expect(
      taskEventToRecord({
        event: "runner_on_ok",
        host: "web-01",
        changed: false,
        rc: 0,
        stdout: "",
      })
    ).toEqual({
      event: "runner_on_ok",
      host: "web-01",
      changed: false,
      rc: 0,
      stdout: "",
    })
  })

  test("copies stats", () => {
    const stats = {
      ok: { web: 1 },
      changed: {},
      failures: {},
      dark: {},
      skipped: {},
    }
    expect(
      taskEventToRecord({ event: "playbook_on_stats", stats }).stats
    ).toEqual(stats)
  })
})

describe("toEventIterator", () => {
  const done: Done = { status: "successful", rc: 0, ok: true }

  test("yields task records and returns the done payload", async () => {
    const result = await drain(
      toEventIterator(
        frames(
          { task: { event: "playbook_on_start" } },
          { task: { event: "runner_on_ok", host: "web-01" } },
          { done }
        )
      )
    )
    expect(result.records).toEqual([
      { event: "playbook_on_start" },
      { event: "runner_on_ok", host: "web-01" },
    ])
    expect(result.done).toEqual(done)
  })

  test("stops at the done frame", async () => {
    const result = await drain(
      toEventIterator(frames({ done }, { task: { event: "late" } }))
    )
    expect(result.records).toEqual([])
  })

  test("throws on an error frame", async () => {
    const iterator = toEventIterator(
      frames({ task: { event: "playbook_on_start" } }, { error: "boom" })
    )
    expect(await iterator.next()).toEqual({
      done: false,
      value: { event: "playbook_on_start" },
    })
    await expect(iterator.next()).rejects.toThrow("boom")
  })

  test("skips heartbeat frames", async () => {
    const result = await drain(
      toEventIterator(
        frames(
          { heartbeat: {} },
          { task: { event: "playbook_on_start" } },
          { heartbeat: {} },
          { heartbeat: {} },
          { task: { event: "runner_on_ok", host: "web-01" } },
          { heartbeat: {} },
          { done }
        )
      )
    )
    expect(result.records).toEqual([
      { event: "playbook_on_start" },
      { event: "runner_on_ok", host: "web-01" },
    ])
    expect(result.done).toEqual(done)
  })

  test("a heartbeat is not a terminal frame", async () => {
    await expect(
      drain(toEventIterator(frames({ heartbeat: {} })))
    ).rejects.toThrow("without a terminal frame")
  })

  test("throws when the stream ends without a terminal frame", async () => {
    await expect(
      drain(toEventIterator(frames({ task: { event: "playbook_on_start" } })))
    ).rejects.toThrow("without a terminal frame")
  })
})

function grpcError(code: number, details: string) {
  return Object.assign(new Error(details), { code, details })
}

describe("describeStreamError", () => {
  test("reports a reset stream as a lost connection", () => {
    const err = grpcError(
      grpcStatus.INTERNAL,
      "Received RST_STREAM with code 2 (Internal server error)"
    )
    expect(isStreamLost(err)).toBe(true)
    const message = describeStreamError(err)
    expect(message).toStartWith(
      "Se perdió la conexión con el servicio de Ansible"
    )
    expect(message).toContain(
      "gRPC INTERNAL: Received RST_STREAM with code 2 (Internal server error)"
    )
  })

  test("reports an unavailable service as a lost connection", () => {
    const err = grpcError(grpcStatus.UNAVAILABLE, "Connection dropped")
    expect(describeStreamError(err)).toContain(
      "Se perdió la conexión con el servicio de Ansible (gRPC UNAVAILABLE: Connection dropped)"
    )
  })

  test("keeps other gRPC statuses as they are", () => {
    const err = grpcError(grpcStatus.DEADLINE_EXCEEDED, "Deadline exceeded")
    expect(isStreamLost(err)).toBe(false)
    expect(describeStreamError(err)).toBe(
      "gRPC DEADLINE_EXCEEDED: Deadline exceeded"
    )
  })

  test("uses the message of a plain error", () => {
    const err = new Error("boom")
    expect(isStreamLost(err)).toBe(false)
    expect(describeStreamError(err)).toBe("boom")
  })
})
