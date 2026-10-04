import { describe, expect, test } from "bun:test"
import { inventoryInput } from "#v1/inventory/input"
import {
  groupName,
  inventoryName,
  isReservedGroupName,
} from "#v1/inventory/name"

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

describe("groupName", () => {
  const groupParses = (value: string) => groupName.safeParse(value).success

  test.each(["all", "All", "ALL"])("reserves %p", (name) => {
    expect(isReservedGroupName(name)).toBe(true)
    expect(groupParses(name)).toBe(false)
  })

  test.each(["all-hosts", "ball", "web"])("accepts %p", (name) => {
    expect(isReservedGroupName(name)).toBe(false)
    expect(groupParses(name)).toBe(true)
  })

  test("device names may still be all", () => {
    expect(
      inventoryInput.devices.create.safeParse({
        name: "all",
        ipAddress: "10.0.0.1",
      }).success
    ).toBe(true)
    expect(
      inventoryInput.groups.create.safeParse({ name: "all" }).success
    ).toBe(false)
  })
})
