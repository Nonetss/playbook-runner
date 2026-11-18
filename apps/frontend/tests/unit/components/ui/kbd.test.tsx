import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

afterEach(cleanup)

describe("Kbd", () => {
  test("a key is drawn inside a kbd element", () => {
    const { container } = render(<Kbd>esc</Kbd>)

    const key = container.querySelector("kbd")
    expect(key?.textContent).toBe("esc")
  })

  test("a group lists several keys side by side", () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
      </KbdGroup>
    )

    const keys = [...container.querySelectorAll("kbd")].map(
      (key) => key.textContent
    )
    expect(keys).toEqual(["↑", "↓"])
  })

  test("extra classes are merged without dropping the keycap look", () => {
    const { container } = render(<Kbd className="ml-2">⌘K</Kbd>)

    const key = container.querySelector("kbd")
    expect(key?.getAttribute("data-slot")).toBe("kbd")
    expect(key?.className).toContain("ml-2")
    expect(key?.className).toContain("font-mono")
  })
})
