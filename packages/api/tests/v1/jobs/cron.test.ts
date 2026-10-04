import { describe, expect, test } from "bun:test"
import { cronExpression, forks, isValidCron } from "#v1/jobs/cron"

describe("isValidCron", () => {
  test.each([
    "*/5 * * * *",
    "0 3 * * 1-5",
    "@daily",
  ])("accepts %p", (pattern) => {
    expect(isValidCron(pattern)).toBe(true)
  })

  test.each([
    "not a cron",
    "* * *",
    "61 * * * *",
    "",
  ])("rejects %p", (pattern) => {
    expect(isValidCron(pattern)).toBe(false)
  })
})

describe("cronExpression", () => {
  test.each([
    null,
    undefined,
    "",
    "  ",
    "  */5 * * * *  ",
  ])("accepts %p", (value) => {
    expect(cronExpression.safeParse(value).success).toBe(true)
  })

  test("rejects an invalid expression", () => {
    expect(cronExpression.safeParse("every day").success).toBe(false)
  })
})

describe("forks", () => {
  test.each([1, 50])("accepts %p", (value) => {
    expect(forks.safeParse(value).success).toBe(true)
  })

  test.each([0, 51, 1.5, -1])("rejects %p", (value) => {
    expect(forks.safeParse(value).success).toBe(false)
  })
})
