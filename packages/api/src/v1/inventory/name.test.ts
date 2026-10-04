import { describe, expect, test } from "bun:test"
import { inventoryName } from "#v1/inventory/name"

const parses = (value: string) => inventoryName.safeParse(value).success

describe("inventoryName", () => {
  test.each([
    "web-01.prod",
    "a",
    "db_1",
    "x".repeat(64),
  ])("accepts %p", (name) => {
    expect(parses(name)).toBe(true)
  })

  test.each([
    "x".repeat(65),
    ".",
    "..",
    "../../x",
    "a b",
    "a/b",
    "",
  ])("rejects %p", (name) => {
    expect(parses(name)).toBe(false)
  })
})
