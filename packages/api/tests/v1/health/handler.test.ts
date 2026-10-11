import { describe, expect, test } from "bun:test"
import { anonymousContext } from "#tests/fixtures/context"
import { healthHandler } from "#v1/health/handler"

describe("health.check", () => {
  test("answers OK without touching anything", async () => {
    expect(await healthHandler.check({ context: anonymousContext() })).toBe(
      "OK"
    )
  })
})
