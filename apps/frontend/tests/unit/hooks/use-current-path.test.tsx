import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCurrentPath } from "@/hooks/use-current-path"

afterEach(cleanup)

describe("useCurrentPath", () => {
  test("follows the location across Astro page swaps", () => {
    window.history.replaceState(null, "", "/playbooks")
    const { result } = renderHook(() => useCurrentPath("/stale"))

    expect(result.current).toBe("/playbooks")

    act(() => {
      window.history.replaceState(null, "", "/scripts")
      document.dispatchEvent(new Event("astro:after-swap"))
    })
    expect(result.current).toBe("/scripts")
  })
})
