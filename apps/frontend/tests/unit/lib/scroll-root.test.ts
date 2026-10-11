import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test"
import { animateScrollToTop } from "@/lib/scroll-root"

/** Frames the animation asked for, run by hand with a chosen timestamp. */
let frames: FrameRequestCallback[] = []
let now = 0

function runFrame(at: number) {
  now = at
  const pending = frames
  frames = []
  for (const frame of pending) frame(at)
}

function scrolledElement(offset: number) {
  const element = document.createElement("div")
  element.scrollTop = offset
  return element
}

function prefersReducedMotion(reduce: boolean) {
  const matchMedia = window.matchMedia.bind(window)
  spyOn(window, "matchMedia").mockImplementation((query: string) =>
    Object.defineProperty(matchMedia(query), "matches", {
      value: reduce && query.includes("reduce"),
    })
  )
}

beforeEach(() => {
  frames = []
  now = 0
  spyOn(performance, "now").mockImplementation(() => now)
  spyOn(window, "requestAnimationFrame").mockImplementation((frame) => {
    frames.push(frame)
    return frames.length
  })
  spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    frames = []
  })
})

afterEach(() => mock.restore())

describe("animateScrollToTop", () => {
  test("does nothing when already at the top", () => {
    prefersReducedMotion(false)
    const element = scrolledElement(0)

    animateScrollToTop(element)

    expect(frames).toHaveLength(0)
  })

  test("jumps straight to the top when reduced motion is preferred", () => {
    prefersReducedMotion(true)
    const element = scrolledElement(800)

    animateScrollToTop(element)

    expect(element.scrollTop).toBe(0)
    expect(frames).toHaveLength(0)
  })

  test("eases down frame by frame and reaches the top", () => {
    prefersReducedMotion(false)
    const element = scrolledElement(800)

    animateScrollToTop(element)
    runFrame(100)
    const midway = element.scrollTop
    runFrame(400)

    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(800)
    expect(element.scrollTop).toBe(0)
    expect(frames).toHaveLength(0)
  })

  test("stops as soon as the user scrolls", () => {
    prefersReducedMotion(false)
    const element = scrolledElement(800)

    animateScrollToTop(element)
    runFrame(100)
    const whenInterrupted = element.scrollTop
    document.dispatchEvent(new Event("wheel"))
    runFrame(400)

    expect(element.scrollTop).toBe(whenInterrupted)
  })
})
