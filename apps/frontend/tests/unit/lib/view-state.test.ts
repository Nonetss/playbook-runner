import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test"
import { createSimpleViewState, createViewState } from "@/lib/view-state"

const state = createViewState("test:view", (raw) => ({
  expanded: Array.isArray(raw.expanded)
    ? raw.expanded.filter((id): id is string => typeof id === "string")
    : [],
}))

beforeEach(() => sessionStorage.clear())

describe("createViewState", () => {
  test("nothing saved reads as null", () => {
    expect(state.read()).toBeNull()
  })

  test("round-trips the scroll position and the extra state", () => {
    state.save(420, { expanded: ["a", "b"] })

    expect(state.read()).toEqual({ scrollY: 420, expanded: ["a", "b"] })
  })

  test("a stored value without a numeric scroll restores to the top", () => {
    sessionStorage.setItem("test:view", JSON.stringify({ scrollY: "x" }))

    expect(state.read()).toEqual({ scrollY: 0, expanded: [] })
  })

  test("malformed JSON reads as null", () => {
    sessionStorage.setItem("test:view", "{oops")

    expect(state.read()).toBeNull()
  })

  describe("when storage refuses writes", () => {
    afterEach(() => mock.restore())

    test("saving does not throw", () => {
      spyOn(sessionStorage, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError")
      })

      expect(() => state.save(10, { expanded: [] })).not.toThrow()
    })
  })
})

describe("createSimpleViewState", () => {
  test("keeps only the scroll position", () => {
    const simple = createSimpleViewState("test:simple")

    simple.save(99, {})

    const restored = simple.read()
    expect(restored?.scrollY).toBe(99)
    expect(Object.keys(restored ?? {})).toEqual(["scrollY"])
  })
})
