import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { useTheme } from "@/features/app-shell/hooks/use-theme"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

afterEach(cleanup)

describe("useTheme", () => {
  test("reads the theme stored by the toggle", () => {
    localStorage.setItem("theme", "dark")

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe("dark")
  })

  test("follows the dark class being toggled on the document", async () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("light")

    document.documentElement.classList.add("dark")
    await waitFor(() => expect(result.current.theme).toBe("dark"))

    document.documentElement.classList.remove("dark")
    await waitFor(() => expect(result.current.theme).toBe("light"))
  })
})
