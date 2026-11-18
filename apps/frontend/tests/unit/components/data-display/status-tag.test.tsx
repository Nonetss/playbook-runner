import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { StatusTag } from "@/components/shared/data-display/status-dot"

afterEach(cleanup)

describe("StatusTag", () => {
  test("shows its word", () => {
    render(<StatusTag dotTone="primary">Activo</StatusTag>)

    expect(screen.getByText("Activo")).toBeTruthy()
  })

  test("an explanation is a hint, not the browser's native title", async () => {
    render(<StatusTag title="Baneado por abuso">Baneado</StatusTag>)
    const tag = screen.getByText("Baneado")

    expect(tag.hasAttribute("title")).toBe(false)
    expect(screen.queryByRole("tooltip")).toBeNull()

    fireEvent.pointerMove(tag)
    const bubble = await screen.findByRole("tooltip")
    expect(bubble.textContent).toBe("Baneado por abuso")
  })

  test("without an explanation there is nothing to show", () => {
    render(<StatusTag>Activo</StatusTag>)

    fireEvent.pointerMove(screen.getByText("Activo"))

    expect(screen.queryByRole("tooltip")).toBeNull()
  })
})
