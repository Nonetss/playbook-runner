import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test"
import {
  RECENT_SURFACES_LIMIT,
  readRecentSurfaces,
  recordRecentSurface,
} from "@/lib/recent-surfaces"

beforeEach(() => localStorage.clear())

describe("recordRecentSurface", () => {
  test("puts the visited page first and moves a repeat to the front", () => {
    recordRecentSurface("user-1", "/playbooks")
    recordRecentSurface("user-1", "/scripts")

    expect(recordRecentSurface("user-1", "/playbooks")).toEqual([
      "/playbooks",
      "/scripts",
    ])
    expect(readRecentSurfaces("user-1")).toEqual(["/playbooks", "/scripts"])
  })

  test("keeps only the most recent pages", () => {
    for (let index = 0; index < RECENT_SURFACES_LIMIT + 2; index += 1) {
      recordRecentSurface("user-1", `/page-${index}`)
    }

    const recent = readRecentSurfaces("user-1")
    expect(recent).toHaveLength(RECENT_SURFACES_LIMIT)
    expect(recent[0]).toBe(`/page-${RECENT_SURFACES_LIMIT + 1}`)
  })

  test("keeps each user's history apart", () => {
    recordRecentSurface("user-1", "/playbooks")

    expect(readRecentSurfaces("user-2")).toEqual([])
  })

  describe("when storage refuses writes", () => {
    afterEach(() => mock.restore())

    test("still returns the new list", () => {
      spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError")
      })

      expect(recordRecentSurface("user-1", "/scripts")).toEqual(["/scripts"])
    })
  })
})

describe("readRecentSurfaces", () => {
  test("malformed JSON reads as an empty list", () => {
    localStorage.setItem("recent-surfaces:user-1", "{not json")

    expect(readRecentSurfaces("user-1")).toEqual([])
  })

  test("a stored value that is not a list reads as an empty list", () => {
    localStorage.setItem("recent-surfaces:user-1", JSON.stringify({ a: 1 }))

    expect(readRecentSurfaces("user-1")).toEqual([])
  })

  test("entries that are not strings are dropped", () => {
    localStorage.setItem(
      "recent-surfaces:user-1",
      JSON.stringify(["/playbooks", 3, null, "/scripts"])
    )

    expect(readRecentSurfaces("user-1")).toEqual(["/playbooks", "/scripts"])
  })
})
