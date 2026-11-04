import { describe, expect, test } from "bun:test"
import { hostAddress } from "#v1/inventory/address"

describe("hostAddress", () => {
  test.each([
    ["10.0.0.10", "10.0.0.10"],
    ["10.0.0.10/32", "10.0.0.10"],
    ["10.0.0.0/24", "10.0.0.0"],
    ["2001:db8::1", "2001:db8::1"],
    ["2001:db8::1/128", "2001:db8::1"],
  ])("%s connects to %s", (value, expected) => {
    expect(hostAddress(value)).toBe(expected)
  })
})
