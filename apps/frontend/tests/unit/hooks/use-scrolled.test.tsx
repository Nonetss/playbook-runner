import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useScrolled } from "@/hooks/use-scrolled"

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  window.scrollTo(0, 0)
})

describe("useScrolled", () => {
  test("turns true once an app scroller passes the threshold, and back", () => {
    const scroller = document.createElement("div")
    scroller.setAttribute("data-app-scroller", "")
    document.body.append(scroller)
    const { result } = renderHook(() => useScrolled(8))

    expect(result.current).toBe(false)

    act(() => {
      scroller.scrollTop = 20
      scroller.dispatchEvent(new Event("scroll"))
    })
    expect(result.current).toBe(true)

    act(() => {
      scroller.scrollTop = 0
      document.dispatchEvent(new Event("astro:after-swap"))
    })
    expect(result.current).toBe(false)
  })

  test("staying within the threshold is not scrolled", () => {
    const scroller = document.createElement("div")
    scroller.setAttribute("data-app-scroller", "")
    document.body.append(scroller)
    const { result } = renderHook(() => useScrolled(8))

    act(() => {
      scroller.scrollTop = 8
      scroller.dispatchEvent(new Event("scroll"))
    })
    expect(result.current).toBe(false)
  })
})
