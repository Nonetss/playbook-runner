import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/client"
import {
  isTransportError,
  MAX_REATTACH_ATTEMPTS,
  reattachDelay,
} from "@/features/jobs/lib/run-watch-retry"

describe("isTransportError", () => {
  test("a network failure or cut stream is worth reattaching to", () => {
    expect(isTransportError(new TypeError("Failed to fetch"))).toBe(true)
    expect(isTransportError(new Error("network error"))).toBe(true)
  })

  test("a proxy answering for an unreachable backend is worth reattaching to", () => {
    for (const code of [
      "BAD_GATEWAY",
      "SERVICE_UNAVAILABLE",
      "GATEWAY_TIMEOUT",
    ]) {
      expect(isTransportError(new ORPCError(code))).toBe(true)
    }
  })

  test("an API refusal ends the watch", () => {
    for (const code of [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "BAD_REQUEST",
      "INTERNAL_SERVER_ERROR",
    ]) {
      expect(isTransportError(new ORPCError(code))).toBe(false)
    }
  })
})

describe("reattachDelay", () => {
  test("backs off 1, 2, 4 then 8 seconds for every attempt allowed", () => {
    const delays = Array.from({ length: MAX_REATTACH_ATTEMPTS }, (_, i) =>
      reattachDelay(i + 1)
    )
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 8_000])
  })

  test("never returns less than the first delay", () => {
    expect(reattachDelay(0)).toBe(1_000)
  })
})
