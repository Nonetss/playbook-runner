import { describe, expect, test } from "bun:test"
import { safeExtravars } from "#v1/run/extravars"

const parses = (value: unknown) => safeExtravars.safeParse(value).success

describe("safeExtravars", () => {
  test("accepts ordinary identifiers", () => {
    expect(parses({ app_version: "1.2.3", _x: "y", Env2: "prod" })).toBe(true)
    expect(parses({})).toBe(true)
  })

  test.each([
    "ansible_host",
    "ANSIBLE_ssh_common_args",
    "Ansible_become",
  ])("rejects the reserved key %p", (key) => {
    expect(parses({ [key]: "x" })).toBe(false)
  })

  test.each([
    "1abc",
    "a-b",
    "a b",
    "",
  ])("rejects the non-identifier %p", (key) => {
    expect(parses({ [key]: "x" })).toBe(false)
  })

  test("keeps each value's type", () => {
    const value = {
      flag: false,
      count: 1,
      ports: [{ port: "22", proto: "tcp" }],
      nothing: null,
      nested: { a: "b" },
    }
    expect(safeExtravars.parse(value)).toEqual(value)
  })

  test("rejects what JSON cannot carry", () => {
    expect(parses({ when: new Date() })).toBe(false)
    expect(parses({ fn: () => 1 })).toBe(false)
  })
})
