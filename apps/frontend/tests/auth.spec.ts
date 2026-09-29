import { expect, test } from "@playwright/test"
import { pinLocaleTo, TEST_LOCALE, waitForHydration } from "./helpers"

test.describe("Navbar autenticada (escritorio)", () => {
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("muestra logo y las tres secciones de navegación", async ({ page }) => {
    await page.goto("/")
    const banner = page.getByRole("banner")
    await expect(banner).toBeVisible()

    await expect(
      banner.getByRole("link", { name: /playbook runner/i })
    ).toBeVisible()

    const nav = banner.locator("ul").first()
    for (const label of ["Inventario", "Automatización", "Jobs"]) {
      await expect(
        nav.getByRole("button", { name: label, exact: true })
      ).toBeVisible()
    }
  })

  test("el desplegable de una sección enlaza a sus páginas", async ({
    page,
  }) => {
    await page.goto("/")
    const trigger = page
      .getByRole("banner")
      .getByRole("button", { name: "Automatización", exact: true })
    await waitForHydration(trigger)
    await trigger.click()

    const menu = page.getByRole("menu")
    for (const label of [/playbooks/i, /scripts/i, /comandos/i]) {
      await expect(
        menu.getByRole("menuitem", { name: label }).first()
      ).toBeVisible()
    }
  })

  test("marca como activa la sección del path actual", async ({ page }) => {
    await page.goto("/playbooks")
    const nav = page.getByRole("banner").locator("ul").first()

    await expect(
      nav.getByRole("button", { name: "Automatización", exact: true })
    ).toHaveAttribute("aria-current", "page")
    await expect(
      nav.getByRole("button", { name: "Inventario", exact: true })
    ).not.toHaveAttribute("aria-current", "page")
  })

  test("las páginas de sección muestran la barra lateral", async ({ page }) => {
    await page.goto("/inventory/devices")
    const sidebarLink = page
      .locator("[data-sidebar=sidebar]")
      .getByRole("link", { name: "Credenciales", exact: true })
    await waitForHydration(sidebarLink)
    await expect(sidebarLink).toBeVisible()
    await expect(
      page
        .locator("[data-sidebar=sidebar]")
        .getByRole("link", { name: "Dispositivos", exact: true })
    ).toHaveAttribute("data-active", "true")
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
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

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
