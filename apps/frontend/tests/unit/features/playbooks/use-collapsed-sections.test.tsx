import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCollapsedSections } from "@/features/playbooks/hooks/use-collapsed-sections"

const KEY = "playbooks.collapsed-sections"

beforeEach(() => localStorage.clear())

afterEach(() => {
  cleanup()
  mock.restore()
})

describe("useCollapsedSections", () => {
  test("starts from what this browser remembered", () => {
    localStorage.setItem(KEY, JSON.stringify(["folder-1", 7]))

    const { result } = renderHook(() => useCollapsedSections())

    expect([...result.current.collapsed]).toEqual(["folder-1"])
  })

  test("toggling collapses and expands a section and remembers it", () => {
    const { result } = renderHook(() => useCollapsedSections())

    act(() => result.current.toggle("repo-1"))
    expect(result.current.collapsed.has("repo-1")).toBe(true)
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toEqual(["repo-1"])

    act(() => result.current.toggle("repo-1"))
    expect(result.current.collapsed.has("repo-1")).toBe(false)
  })

  test("malformed storage starts with everything expanded", () => {
    localStorage.setItem(KEY, "{broken")

    const { result } = renderHook(() => useCollapsedSections())

    expect(result.current.collapsed.size).toBe(0)
  })

  test("a storage that refuses writes still toggles in memory", () => {
    spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    const { result } = renderHook(() => useCollapsedSections())

    act(() => result.current.toggle("repo-1"))

    expect(result.current.collapsed.has("repo-1")).toBe(true)
  })
})
