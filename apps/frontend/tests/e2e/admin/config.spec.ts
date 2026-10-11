import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

type ApiKeyRow = { id: string; name: string | null }

/** The card of one API key, by its (unique) name. */
function apiKeyCard(page: Page, name: string) {
  return page.getByRole("main").getByRole("listitem").filter({ hasText: name })
}

test.describe("API keys", () => {
  test("la página muestra la cabecera y el enlace a la documentación", async ({
    page,
  }) => {
    await page.goto("/config")

    await expect(
      page.getByRole("heading", { level: 1, name: "API keys", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Claves API para acceso programático.")
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Abrir documentación de la API" })
    ).toHaveAttribute("href", "/scalar")

    const create = page.getByRole("button", { name: "Nueva API key" }).first()
    await waitForHydration(create)
    await expect(create).toBeEnabled()
  })

  test("crea una API key y muestra la clave completa una sola vez", async ({
    page,
    seed,
  }) => {
    const name = seed.name("key")

    try {
      await page.goto("/config")
      const create = page.getByRole("button", { name: "Nueva API key" }).first()
      await waitForHydration(create)
      await create.click()

      const form = page.getByRole("dialog", { name: "Nueva API key" })
      await form.getByLabel("Nombre", { exact: true }).fill(name)
      await expect(form.getByRole("combobox")).toContainText("30 días")
      await form.getByRole("button", { name: "Crear API key" }).click()

      const created = page.getByRole("dialog", { name: "API key creada" })
      await expect(created).toContainText("No podrás volver a verla.")
      const keyField = created.getByRole("textbox", {
        name: "Copiar API key",
      })
      await expect(keyField).toHaveValue(/\S{20,}/)
      const fullKey = await keyField.inputValue()

      await created
        .getByRole("button", { name: "Cerrar", exact: true })
        .first()
        .click()
      await expect(created).toBeHidden()

      const card = apiKeyCard(page, name)
      await expect(card).toBeVisible()
      await expect(card).toContainText("Activa")
      // The full key is never shown again, neither as text nor in a field.
      await expect(page.getByText(fullKey)).toHaveCount(0)
      await expect(page.locator(`input[value="${fullKey}"]`)).toHaveCount(0)

      await page.reload()
      await expect(apiKeyCard(page, name)).toBeVisible()
      await expect(page.getByText(fullKey)).toHaveCount(0)
    } finally {
      // Delete whatever the UI created, even if an assertion failed.
      const keys = await rpc<ApiKeyRow[]>(page.request, "apiKeys/list")
      for (const key of keys.filter((row) => row.name === name)) {
        seed.track("apiKeys/delete", { id: key.id })
      }
    }
  })

  test("elimina una API key desde su menú tras confirmar", async ({
    page,
    seed,
  }) => {
    const apiKey = await seed.create<{ id: string; name: string }>(
      "apiKeys/create",
      { name: seed.name("key") },
      "apiKeys/delete"
    )
    await page.goto("/config")

    const actions = page.getByRole("button", {
      name: `Acciones para ${apiKey.name}`,
    })
    await waitForHydration(actions)
    await actions.click()
    await page.getByRole("menuitem", { name: "Eliminar" }).click()

    const dialog = page.getByRole("dialog", {
      name: `Eliminar "${apiKey.name}"`,
    })
    await expect(dialog).toContainText(
      "Cualquier integración que esté usando esta clave dejará de funcionar."
    )
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(apiKeyCard(page, apiKey.name)).toHaveCount(0)
    const keys = await rpc<ApiKeyRow[]>(page.request, "apiKeys/list")
    expect(keys.some((row) => row.id === apiKey.id)).toBe(false)
  })
})
