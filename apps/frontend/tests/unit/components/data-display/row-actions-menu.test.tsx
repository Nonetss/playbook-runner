import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

afterEach(cleanup)

/** Radix opens its menus from the keyboard as reliably as from a pointer. */
function openMenu(name: string) {
  fireEvent.keyDown(screen.getByRole("button", { name }), { key: "Enter" })
}

describe("RowActionsMenu", () => {
  test("its trigger is named generically unless given a label", () => {
    render(
      <RowActionsMenu>
        <DropdownMenuItem>Editar</DropdownMenuItem>
      </RowActionsMenu>
    )

    expect(screen.getByRole("button", { name: "Acciones" })).toBeDefined()
  })

  test("opens its actions and runs the one chosen", async () => {
    const onEdit = mock(() => {})
    render(
      <RowActionsMenu label="Acciones para web-1">
        <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
      </RowActionsMenu>
    )

    openMenu("Acciones para web-1")
    fireEvent.click(await screen.findByRole("menuitem", { name: "Editar" }))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test("a disabled menu cannot be pressed", () => {
    render(
      <RowActionsMenu label="Acciones para web-1" disabled>
        <DropdownMenuItem>Editar</DropdownMenuItem>
      </RowActionsMenu>
    )

    expect(
      screen
        .getByRole("button", { name: "Acciones para web-1" })
        .hasAttribute("disabled")
    ).toBe(true)
  })
})
