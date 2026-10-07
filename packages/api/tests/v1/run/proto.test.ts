import { describe, expect, test } from "bun:test"
import type { Done, RunBundleResponse } from "@playbook-runner/grpc/stubs"
import {
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
