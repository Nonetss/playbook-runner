import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, renderHook } from "@testing-library/react"
import { useHydrated } from "@/hooks/use-hydrated"

afterEach(cleanup)

describe("useHydrated", () => {
  test("is true once rendered on the client", () => {
    const { result } = renderHook(() => useHydrated())

    expect(result.current).toBe(true)
  })
})
