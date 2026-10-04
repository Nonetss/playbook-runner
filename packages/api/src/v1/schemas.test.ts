import { describe, expect, test } from "bun:test"
import { idSchema } from "#v1/schemas"

describe("idSchema", () => {
  test("accepts a UUID", () => {
    expect(
      idSchema.safeParse("0b6f1c0e-7f3a-4c2e-9a51-2d3b4c5d6e7f").success
    ).toBe(true)
  })

  test.each([
    "",
    "1",
    "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
  ])("rejects %p", (value) => {
    expect(idSchema.safeParse(value).success).toBe(false)
  })
})
