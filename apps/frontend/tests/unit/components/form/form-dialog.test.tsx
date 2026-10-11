import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { SyntheticEvent } from "react"
import { FormDialog } from "@/components/shared/form/form-dialog"

afterEach(cleanup)

function renderForm(props: Partial<Parameters<typeof FormDialog>[0]> = {}) {
  const onOpenChange = mock((_: boolean) => {})
  const onSubmit = mock((event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
  })
  render(
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Nuevo script"
      description="Se ejecuta con bash"
      onSubmit={onSubmit}
      submitLabel="Crear"
      cancelLabel="Cancelar"
      {...props}
    >
      <input aria-label="Nombre" />
    </FormDialog>
  )
  return { onOpenChange, onSubmit }
}

describe("FormDialog", () => {
  test("is a dialog named by its title and described by its description", () => {
    renderForm()

    const dialog = screen.getByRole("dialog", { name: "Nuevo script" })
    expect(dialog.textContent).toContain("Se ejecuta con bash")
  })

  test("submitting runs onSubmit", () => {
    const { onSubmit } = renderForm()

    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  test("cancel closes the dialog", () => {
    const { onOpenChange } = renderForm()

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test("while pending neither cancel nor submit can be pressed", () => {
    renderForm({ isPending: true })

    expect(
      screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "Crear" }).hasAttribute("disabled")
    ).toBe(true)
  })

  test("submitDisabled blocks only the submit", () => {
    renderForm({ submitDisabled: true })

    expect(
      screen.getByRole("button", { name: "Crear" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")
    ).toBe(false)
  })

  test("without onSubmit it is informational and shows only a close button", () => {
    const { onOpenChange } = renderForm({
      onSubmit: undefined,
      cancelLabel: "Entendido",
    })

    expect(screen.queryByRole("button", { name: "Crear" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
