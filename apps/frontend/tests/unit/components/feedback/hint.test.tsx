import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Hint } from "@/components/shared/feedback/hint"

afterEach(cleanup)

function renderHint() {
  render(
    <Hint label="Cambiar tema">
      <button type="button" aria-label="Cambiar tema">
        icono
      </button>
    </Hint>
  )
  return screen.getByRole("button", { name: "Cambiar tema" })
}

describe("Hint", () => {
  test("nothing is shown until the control is focused", () => {
    renderHint()

    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  test("keyboard focus shows the label and leaving hides it", async () => {
    const control = renderHint()

    fireEvent.focus(control)
    const bubble = await screen.findByRole("tooltip")
    expect(bubble.textContent).toBe("Cambiar tema")

    fireEvent.blur(control)
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  test("the control keeps its own accessible name", () => {
    const control = renderHint()

    expect(control.getAttribute("aria-label")).toBe("Cambiar tema")
    expect(control.hasAttribute("title")).toBe(false)
  })
})
