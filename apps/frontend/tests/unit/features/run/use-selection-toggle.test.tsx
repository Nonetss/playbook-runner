import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useState } from "react"
import { toggleIn } from "@/features/run/hooks/use-selection-toggle"

afterEach(cleanup)

describe("toggleIn", () => {
  test("adds an id that is missing and removes one that is present", () => {
    const { result } = renderHook(() => {
      const [selected, setSelected] = useState(new Set(["a"]))
      return { selected, toggle: toggleIn(setSelected) }
    })
    const before = result.current.selected

    act(() => result.current.toggle("b"))
    expect([...result.current.selected]).toEqual(["a", "b"])

    act(() => result.current.toggle("a"))
    expect([...result.current.selected]).toEqual(["b"])
    expect([...before]).toEqual(["a"])
  })
})
