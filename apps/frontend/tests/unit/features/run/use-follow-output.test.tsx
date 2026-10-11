import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useFollowOutput } from "@/features/run/hooks/use-follow-output"

/** A console of `scrollHeight` px showing a 100 px window. */
function consoleElement(scrollHeight: number) {
  const element = document.createElement("div")
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  })
  Object.defineProperty(element, "clientHeight", { value: 100 })
  return element
}

function renderFollowing(element: HTMLDivElement) {
  const hook = renderHook(() => useFollowOutput())
  hook.result.current.containerRef.current = element
  hook.rerender()
  return hook
}

afterEach(cleanup)

describe("useFollowOutput", () => {
  test("keeps the console pinned to the latest output", () => {
    const element = consoleElement(1000)
    const { result } = renderFollowing(element)

    expect(result.current.following).toBe(true)
    expect(element.scrollTop).toBe(1000)
  })

  test("scrolling up stops following, and coming back near the bottom resumes it", () => {
    const element = consoleElement(1000)
    const { result } = renderFollowing(element)

    element.scrollTop = 500
    act(() => result.current.handleScroll())
    expect(result.current.following).toBe(false)

    element.scrollTop = 870
    act(() => result.current.handleScroll())
    expect(result.current.following).toBe(true)
  })

  test("jump to latest scrolls to the bottom and follows again", () => {
    const element = consoleElement(1000)
    const { result } = renderFollowing(element)
    element.scrollTop = 100
    act(() => result.current.handleScroll())

    act(() => result.current.jumpToLatest())

    expect(result.current.following).toBe(true)
    expect(element.scrollTop).toBe(1000)
  })
})
