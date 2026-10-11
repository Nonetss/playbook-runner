import { beforeEach, describe, expect, test } from "bun:test"
import { scripts } from "@playbook-runner/db/schema/scripts"
import { createFakeDb, scriptRow, stepArgs } from "@playbook-runner/db/testing"
import { sql } from "drizzle-orm"

const fake = createFakeDb()
const db = fake.db

/** What a chain rejects with; chains are thenables, not real promises. */
async function rejection(chain: PromiseLike<unknown>): Promise<unknown> {
  return chain.then(
    () => undefined,
    (error: unknown) => error
  )
}

beforeEach(() => fake.reset())

describe("fake db", () => {
  test("a chain with nothing queued rejects naming its operation", async () => {
    const error = await rejection(db.select().from(scripts))

    expect(error).toBeInstanceOf(Error)
    expect(String(error)).toContain('no result queued for "select"')
  })

  test("results resolve first in, first out per operation", async () => {
    const first = scriptRow({ name: "first" })
    const second = scriptRow({ name: "second" })
    fake.queue("select", [first], [second])
    fake.queue("update", [first])

    expect(await db.select().from(scripts)).toEqual([first])
    expect(await db.update(scripts).set({ name: "x" }).returning()).toEqual([
      first,
    ])
    expect(await db.select().from(scripts)).toEqual([second])
  })

  test("records each awaited chain with its steps", async () => {
    fake.queue("insert", [])

    await db.insert(scripts).values({ name: "web", content: "uptime" })

    const [insert] = fake.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([
      { name: "web", content: "uptime" },
    ])
  })

  test("a queued error rejects the next chain of that operation", async () => {
    const failure = new Error("boom")
    fake.queueError("delete", failure)

    expect(await rejection(db.delete(scripts))).toBe(failure)
  })

  test("a transaction records a marker and routes writes on tx to the fake", async () => {
    const row = scriptRow()
    fake.queue("execute", undefined)
    fake.queue("insert", [row])

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select 1`)
      return tx.insert(scripts).values({ name: "a", content: "b" }).returning()
    })

    expect(result).toEqual([row])
    expect(fake.calls().map((call) => call.op)).toEqual([
      "transaction",
      "execute",
      "insert",
    ])
  })

  test("reset clears queued results and recorded calls", async () => {
    fake.queue("select", [])
    await db.select().from(scripts)
    fake.queue("select", [])

    fake.reset()

    expect(fake.calls()).toEqual([])
    expect(await rejection(db.select().from(scripts))).toBeInstanceOf(Error)
  })
})
