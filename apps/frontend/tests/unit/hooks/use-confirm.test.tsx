import { afterEach, describe, expect, test } from "bun:test"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useState } from "react"
import { ConfirmProvider, useConfirm } from "@/hooks/use-confirm"

afterEach(cleanup)

function DeleteButton() {
  const confirm = useConfirm()
  const [answer, setAnswer] = useState("pendiente")
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const confirmed = await confirm({
            title: "¿Eliminar el playbook?",
            variant: "destructive",
          })
          setAnswer(confirmed ? "sí" : "no")
        }}
      >
        Eliminar
      </button>
      <output>{answer}</output>
    </>
  )
}

function renderWithProvider() {
  render(
    <ConfirmProvider>
      <DeleteButton />
    </ConfirmProvider>
  )
  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }))
}

describe("useConfirm", () => {
  test("resolves true when the user confirms", async () => {
    renderWithProvider()

    expect(await screen.findByText("¿Eliminar el playbook?")).toBeDefined()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    })

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("sí")
    )
  })

  test("resolves false when the user cancels", async () => {
    renderWithProvider()

    await screen.findByText("¿Eliminar el playbook?")
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    })

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("no")
    )
  })

  test("outside its provider it throws", () => {
    function Orphan() {
      useConfirm()
      return null
    }

    expect(() => render(<Orphan />)).toThrow("ConfirmProvider")
  })
})
