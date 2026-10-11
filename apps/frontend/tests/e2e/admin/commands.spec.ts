import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function deviceRow(page: Page, name: string) {
  return page.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(name)}`),
  })
}

test.describe("Comandos", () => {
  test("la página muestra la cabecera, la barra lateral y la consola en reposo", async ({
    page,
  }) => {
    await page.goto("/commands")

    await expect(
      page.getByRole("heading", { level: 1, name: "Comandos", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Ejecuta comandos remotos puntuales.")
    ).toBeVisible()

    const activeLink = page
      .locator("[data-sidebar=sidebar]")
      .getByRole("link", { name: "Comandos", exact: true })
    await waitForHydration(activeLink)
    await expect(activeLink).toHaveAttribute("data-active", "true")

    await expect(
      page.getByText(
        "Configura el comando y pulsa Ejecutar para ver la salida aquí."
      )
    ).toBeVisible()
    await expect(page.getByLabel("Comando", { exact: true })).toHaveValue(
      "uptime"
    )
    await expect(
      page
        .getByRole("radiogroup", { name: "Módulo" })
        .getByRole("radio", { name: "shell", exact: true })
    ).toHaveAttribute("aria-checked", "true")
  })

  test("Ejecutar exige un destino y un comando", async ({ page, seed }) => {
    const device = await seed.device()
    await page.goto("/commands")

    const search = page.getByPlaceholder("Buscar…", { exact: true })
    await waitForHydration(search)
    const run = page.getByRole("button", { name: /^Ejecutar/ })
    await expect(run).toBeDisabled()

    await search.fill(device.name)
    await deviceRow(page, device.name).click()
    await expect(run).toBeEnabled()

    const command = page.getByLabel("Comando", { exact: true })
    await command.fill("   ")
    await expect(run).toBeDisabled()
    await command.fill("hostname")
    await expect(run).toBeEnabled()

    await page.getByRole("button", { name: "Limpiar (1)" }).click()
    await expect(deviceRow(page, device.name)).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    await expect(run).toBeDisabled()
  })

  test("ejecuta un comando contra un dispositivo y la consola termina", async ({
    page,
    seed,
  }) => {
    test.setTimeout(120_000)
    const device = await seed.device()
    await page.goto("/commands")

    const search = page.getByPlaceholder("Buscar…", { exact: true })
    await waitForHydration(search)
    await search.fill(device.name)
    const row = deviceRow(page, device.name)
    await row.click()
    await expect(row).toHaveAttribute("aria-pressed", "true")

    await page.getByLabel("Comando", { exact: true }).fill("echo e2e")
    const run = page.getByRole("button", { name: /^Ejecutar/ })
    await run.click()

    const confirm = page.getByRole("dialog", {
      name: "¿Ejecutar este comando?",
    })
    await expect(confirm).toContainText(device.name)
    await expect(confirm).toContainText("shell")
    await confirm.getByRole("button", { name: "Iniciar ejecución" }).click()

    // Any terminal outcome counts (the runner may be up or down): the
    // "new run" action only becomes enabled once the stream has ended.
    await expect(
      page.getByRole("button", { name: "Nueva ejecución" })
    ).toBeEnabled({ timeout: 90_000 })
    await expect(
      page.getByText("Salida en tiempo real conectada.")
    ).toHaveCount(0)
    await expect(run).toBeEnabled()
  })
})
