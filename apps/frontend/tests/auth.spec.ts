import { expect, test } from "@playwright/test"
import { waitForHydration } from "./helpers"

test.describe("Navbar autenticada (escritorio)", () => {
  test("muestra logo y los cinco links de navegación", async ({ page }) => {
    await page.goto("/")
    const banner = page.getByRole("banner")
    await expect(banner).toBeVisible()

    await expect(
      banner.getByRole("link", { name: /playbook runner/i })
    ).toBeVisible()

    const nav = banner.locator("ul").first()
    for (const label of [
      "Inicio",
      "Credenciales",
      "Inventario",
      "Playbooks",
      "Jobs",
    ]) {
      await expect(
        nav.getByRole("link", { name: label, exact: true })
      ).toBeVisible()
    }
  })

  test("marca como activo el link correspondiente al path actual", async ({
    page,
  }) => {
    await page.goto("/playbooks")
    const banner = page.getByRole("banner")
    const activeLink = banner
      .locator("ul")
      .first()
      .getByRole("link", { name: "Playbooks", exact: true })

    await expect(activeLink).toHaveClass(/bg-secondary/)
    await expect(activeLink).toHaveAttribute("href", "/playbooks")
  })

  test("user nav muestra email del usuario autenticado", async ({ page }) => {
    await page.goto("/")
    const accountMenu = page.getByRole("button", { name: /menú de cuenta/i })
    await waitForHydration(accountMenu)
    await accountMenu.click()

    const menu = page.getByRole("menu")
    await expect(menu).toBeVisible()
    await expect(menu).toContainText("admin@playbook-runner.local")
  })

  test("logout desde user nav vuelve a /login", async ({ page }) => {
    await page.goto("/")
    const accountMenu = page.getByRole("button", { name: /menú de cuenta/i })
    await waitForHydration(accountMenu)
    await accountMenu.click()
    await page.getByRole("menuitem", { name: /cerrar sesión/i }).click()

    await page.waitForURL(/\/login$/, { timeout: 15_000 })
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /iniciar sesión/i })
    ).toBeVisible()
  })
})

test.describe("Dashboard autenticada", () => {
  test("renderiza el saludo y la grilla de stats", async ({ page }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { level: 1, name: /bienvenido/i })
    ).toBeVisible()

    for (const stat of ["Jobs", "Playbooks", "Dispositivos", "Credenciales"]) {
      await expect(
        page.getByRole("link").filter({ hasText: stat }).first()
      ).toBeVisible()
    }

    await expect(page.getByRole("link", { name: /nuevo job/i })).toBeVisible()
  })
})
