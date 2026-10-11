import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile"

/** Resizes the happy-dom viewport, firing the media query listeners. */
function setViewportWidth(width: number) {
  act(() => {
    window.happyDOM?.setViewport({ width, height: 800 })
  })
}

afterEach(() => {
  cleanup()
  setViewportWidth(1024)
})

describe("useIsMobile", () => {
  test("is true below the md breakpoint and follows resizes", () => {
    setViewportWidth(1280)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    setViewportWidth(767)
    expect(result.current).toBe(true)

    setViewportWidth(768)
    expect(result.current).toBe(false)
  })
})

describe("useIsTablet", () => {
  // happy-dom fires no `change` for this ranged query, so each width is
  // read by a fresh render instead of through the subscription.
  for (const [width, tablet] of [
    [500, false],
    [768, true],
    [1023, true],
    [1024, false],
  ] as const) {
    test(`a ${width}px viewport is ${tablet ? "" : "not "}a tablet`, () => {
      setViewportWidth(width)
      const { result } = renderHook(() => useIsTablet())

      expect(result.current).toBe(tablet)
    })
  }
})
