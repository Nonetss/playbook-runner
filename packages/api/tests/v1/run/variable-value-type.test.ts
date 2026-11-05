import { describe, expect, test } from "bun:test"
import { toVariableValueType } from "#v1/run/variable-value-type"

describe("toVariableValueType", () => {
  test.each(["text", "boolean", "number", "json"])("keeps %p", (type) => {
    expect(toVariableValueType(type)).toBe(type)
  })

  test.each(["", "date"])("reads %p as text", (type) => {
    expect(toVariableValueType(type)).toBe("text")
  })
})
