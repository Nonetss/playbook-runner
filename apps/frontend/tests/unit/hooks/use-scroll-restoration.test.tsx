import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { cleanup, renderHook } from "@testing-library/react"
import { useElementScrollRestoration } from "@/hooks/use-scroll-restoration"
import { createSimpleViewState } from "@/lib/view-state"

/** A scroller whose saved offset lives under `scroll:<pathname>`. */
function setup(initialScrollTop = 0) {
  const element = document.createElement("div")
  element.scrollTop = initialScrollTop
  document.body.append(element)
  const ref = { current: element }
  const resolveKey = () => `scroll:${window.location.pathname}`
  return { element, ref, resolveKey }
}

function saved(key: string) {
  return createSimpleViewState(key).read()?.scrollY
}

function scrollTo(element: HTMLElement, offset: number) {
  element.scrollTop = offset
  element.dispatchEvent(new Event("scroll"))
}

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, "", "/playbooks")
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

describe("useElementScrollRestoration", () => {
  test("restores the offset saved for the current page", () => {
    createSimpleViewState("scroll:/playbooks").save(320, {})
    const { element, ref, resolveKey } = setup()

    renderHook(() => useElementScrollRestoration(ref, resolveKey))

    expect(element.scrollTop).toBe(320)
  })

  test("saves where the user scrolled to, and again when it unmounts", () => {
    const { element, ref, resolveKey } = setup()
    const { unmount } = renderHook(() =>
      useElementScrollRestoration(ref, resolveKey)
    )

    scrollTo(element, 150)
    expect(saved("scroll:/playbooks")).toBe(150)

    scrollTo(element, 200)
    unmount()
    expect(saved("scroll:/playbooks")).toBe(200)
  })

  test("once navigation starts, the offset stays under the page being left", () => {
    const { element, ref, resolveKey } = setup()
    const { unmount } = renderHook(() =>
      useElementScrollRestoration(ref, resolveKey)
    )
    scrollTo(element, 90)

    document.dispatchEvent(new Event("astro:before-preparation"))
    window.history.replaceState(null, "", "/scripts")
    scrollTo(element, 0)
    unmount()

    expect(saved("scroll:/playbooks")).toBe(90)
    expect(saved("scroll:/scripts")).toBeUndefined()
  })

  test("a key changed by replaceState while on the page is picked up", () => {
    const { element, ref, resolveKey } = setup()
    renderHook(() => useElementScrollRestoration(ref, resolveKey))

    window.history.replaceState(null, "", "/playbooks/filtered")
    scrollTo(element, 40)

    expect(saved("scroll:/playbooks/filtered")).toBe(40)
  })

  test("without a key it snaps a reused scroller to the top and saves nothing", () => {
    const { element, ref } = setup(500)
    const { unmount } = renderHook(() =>
      useElementScrollRestoration(ref, undefined)
    )

    expect(element.scrollTop).toBe(0)
    scrollTo(element, 75)
    unmount()
    expect(sessionStorage.length).toBe(0)
  })
})
