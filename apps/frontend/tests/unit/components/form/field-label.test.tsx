import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { FieldLabel, FormField } from "@/components/shared/form/field-label"

afterEach(cleanup)

describe("FieldLabel", () => {
  test("labels its control, marking it required without changing the name", () => {
    render(
      <>
        <FieldLabel htmlFor="name" required>
          Nombre
        </FieldLabel>
        <input id="name" />
      </>
    )

    expect(screen.getByLabelText(/Nombre/)).toBeDefined()
    expect(screen.getByText("*")).toBeDefined()
  })
})

describe("FormField", () => {
  test("shows the hint when there is no error", () => {
    render(
      <FormField label="Puerto" htmlFor="port" hint="Por defecto 22">
        <input id="port" />
      </FormField>
    )

    expect(screen.getByText("Por defecto 22")).toBeDefined()
  })

  test("an error replaces the hint", () => {
    render(
      <FormField
        label="Puerto"
        htmlFor="port"
        hint="Por defecto 22"
        error="Debe estar entre 1 y 65535"
      >
        <input id="port" />
      </FormField>
    )

    expect(screen.getByText("Debe estar entre 1 y 65535")).toBeDefined()
    expect(screen.queryByText("Por defecto 22")).toBeNull()
  })
})
