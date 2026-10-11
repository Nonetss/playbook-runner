import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, renderHook } from "@testing-library/react"
import { useOnOpen } from "@/hooks/use-on-open"

afterEach(cleanup)

describe("useOnOpen", () => {
  test("seeds only when open turns from false to true", () => {
    const seed = mock(() => {})
    const { rerender } = renderHook(({ open }) => useOnOpen(open, seed), {
      initialProps: { open: false },
    })

    expect(seed).not.toHaveBeenCalled()
    rerender({ open: true })
    expect(seed).toHaveBeenCalledTimes(1)
    rerender({ open: true })
    expect(seed).toHaveBeenCalledTimes(1)
    rerender({ open: false })
    rerender({ open: true })
    expect(seed).toHaveBeenCalledTimes(2)
  })

  test("a dialog mounted already open is not seeded again", () => {
    const seed = mock(() => {})
    renderHook(() => useOnOpen(true, seed))

    expect(seed).not.toHaveBeenCalled()
  })
})
