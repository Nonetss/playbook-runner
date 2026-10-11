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
    for (const label of ["Inventario", "Ansible", "Bash"]) {
      await expect(
        nav.getByRole("button", { name: label, exact: true })
      ).toBeVisible()
    }
  })

  test("API keys es una entrada de la navbar, no un botón", async ({
    page,
  }) => {
    await page.goto("/")
    const banner = page.getByRole("banner")
    const settings = banner.getByRole("link", {
      name: "API keys",
      exact: true,
    })
    await waitForHydration(settings)
    // The only link to /config is the entry itself, not an icon button.
    await expect(banner.locator('a[href="/config"]')).toHaveCount(1)

    const bash = await banner
      .getByRole("button", { name: "Bash", exact: true })
      .boundingBox()
    const link = await settings.boundingBox()
    if (!bash || !link) throw new Error("navbar entries not laid out")
    expect(link.x).toBeGreaterThan(bash.x + bash.width)

    await settings.click()
    await expect(page).toHaveURL(/\/config$/)
    await expect(settings).toHaveAttribute("aria-current", "page")
  })

  test("el desplegable de una sección se abre al pasar el ratón", async ({
    page,
  }) => {
    await page.goto("/")
    const banner = page.getByRole("banner")
    const trigger = banner.getByRole("button", {
      name: "Ansible",
      exact: true,
    })
    await waitForHydration(trigger)
    await trigger.hover()

    await expect(trigger).toHaveAttribute("data-state", "open")
    for (const label of [/^playbooks/i, /^scheduler/i, /^historial/i]) {
      await expect(
        banner.getByRole("link", { name: label }).first()
      ).toBeVisible()
    }
  })

  test("las rutas de job cuentan como sección Ansible", async ({ page }) => {
    await page.goto("/jobs/new")
    await expect(
      page
        .getByRole("banner")
        .locator("ul")
        .first()
        .getByRole("button", { name: "Ansible", exact: true })
    ).toHaveAttribute("aria-current", "page")
  })

  test("marca como activa la sección del path actual", async ({ page }) => {
    await page.goto("/playbooks")
    const nav = page.getByRole("banner").locator("ul").first()

    await expect(
      nav.getByRole("button", { name: "Ansible", exact: true })
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
