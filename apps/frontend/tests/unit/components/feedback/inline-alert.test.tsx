import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"

afterEach(cleanup)

describe("InlineAlert", () => {
  test("an error is announced as an alert with its title and message", () => {
    render(
      <InlineAlert title="No se pudo guardar">El nombre ya existe</InlineAlert>
    )

    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("No se pudo guardar")
    expect(alert.textContent).toContain("El nombre ya existe")
  })

  test("a neutral note is a status, not an alert", () => {
    render(<InlineAlert tone="muted">Solo lectura</InlineAlert>)

    expect(screen.getByRole("status").textContent).toContain("Solo lectura")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
