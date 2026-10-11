import { expect, type Page, test } from "@playwright/test"
import { pinLocaleTo, TEST_LOCALE, waitForHydration } from "./helpers"

async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await waitForHydration(
    page.getByRole("banner").getByRole("button", { name: "Buscar páginas" })
  )
}

async function openWithShortcut(page: Page) {
  await page.keyboard.press("ControlOrMeta+k")
  const dialog = page.getByRole("dialog", { name: "Buscar páginas" })
  await expect(dialog).toBeVisible()
  return dialog
}

function groupHeading(page: Page, heading: string) {
  return page
    .getByRole("dialog")
    .locator("[cmdk-group-heading]", { hasText: heading })
}

test.describe("Buscador de la navbar (escritorio)", () => {
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("las secciones van a la izquierda tras un separador", async ({
    page,
  }) => {
    await gotoHydrated(page, "/")
    const banner = page.getByRole("banner")
    const logo = await banner
      .getByRole("link", { name: /playbook runner/i })
      .boundingBox()
    const separator = await banner
      .locator('[data-slot="separator"][data-orientation="vertical"]')
      .boundingBox()
    const firstSection = await banner
      .getByRole("button", { name: "Inventario", exact: true })
      .boundingBox()
    const search = await banner
      .getByRole("button", { name: "Buscar páginas" })
      .boundingBox()
    if (!logo || !separator || !firstSection || !search) {
      throw new Error("navbar element not laid out")
    }
    expect(separator.x).toBeGreaterThan(logo.x + logo.width)
    expect(firstSection.x).toBeGreaterThan(separator.x)
    expect(search.x).toBeGreaterThan(firstSection.x + firstSection.width)
    const account = await banner
      .getByRole("button", { name: "Menú de cuenta" })
      .boundingBox()
    if (!account) throw new Error("account button not laid out")
    // The search sits right before the account button.
    expect(account.x).toBeGreaterThan(search.x + search.width)
    expect(account.x - (search.x + search.width)).toBeLessThan(16)
  })

  test("el campo de búsqueda abre el diálogo con el foco en el input", async ({
    page,
  }) => {
    await gotoHydrated(page, "/")
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Buscar páginas" })
      .click()
    const dialog = page.getByRole("dialog", { name: "Buscar páginas" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("combobox")).toBeFocused()
  })

  test("Ctrl+K abre y cierra el diálogo", async ({ page }) => {
    await gotoHydrated(page, "/")
    const dialog = await openWithShortcut(page)
    await page.keyboard.press("ControlOrMeta+k")
    await expect(dialog).toBeHidden()
  })

  test("la búsqueda ignora acentos", async ({ page }) => {
    await gotoHydrated(page, "/")
    const dialog = await openWithShortcut(page)
    await dialog.getByRole("combobox").fill("programatico")
    await expect(dialog.getByRole("option", { name: /API keys/ })).toBeVisible()
  })

  test("varias palabras acotan a una sección", async ({ page }) => {
    await gotoHydrated(page, "/")
    const dialog = await openWithShortcut(page)
    await dialog.getByRole("combobox").fill("ansible historial")
    await expect(
      dialog.getByRole("option", { name: /Historial/ })
    ).toBeVisible()
    await expect(dialog.getByRole("option", { name: /Comandos/ })).toHaveCount(
      0
    )
    await expect(dialog.getByRole("option", { name: /^Bash\b/ })).toHaveCount(0)
  })

  test("todas las páginas se listan, también Usuarios", async ({ page }) => {
    await gotoHydrated(page, "/")
    const dialog = await openWithShortcut(page)
    await dialog.getByRole("combobox").fill("usuarios")
    await expect(dialog.getByRole("option", { name: /Usuarios/ })).toBeVisible()
  })

  test("sin texto no se listan registros", async ({ page }) => {
    await gotoHydrated(page, "/")
    await openWithShortcut(page)
    await expect(groupHeading(page, "General")).toBeVisible()
    await expect(groupHeading(page, "Jobs programados")).toHaveCount(0)
    await expect(groupHeading(page, "Grupos de inventario")).toHaveCount(0)
  })

  test("sin coincidencias muestra el estado vacío", async ({ page }) => {
    await gotoHydrated(page, "/")
    const dialog = await openWithShortcut(page)
    await dialog.getByRole("combobox").fill("zzzz-sin-resultados")
    await expect(
      dialog.getByText("No hay resultados que coincidan.")
    ).toBeVisible()
    await expect(dialog.getByRole("option")).toHaveCount(0)
  })

  test("Intro navega al resultado y cierra el diálogo", async ({ page }) => {
    await gotoHydrated(page, "/")
    const dialog = await openWithShortcut(page)
    await dialog.getByRole("combobox").fill("credenciales")
    await expect(
      dialog.getByRole("option", { name: /Credenciales/ }).first()
    ).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/inventory\/credentials$/)
    await expect(dialog).toBeHidden()
  })

  test("Recientes sugiere las últimas páginas visitadas", async ({ page }) => {
    await gotoHydrated(page, "/playbooks")
    await gotoHydrated(page, "/scripts")
    await gotoHydrated(page, "/config")
    await openWithShortcut(page)
    const recent = page
      .getByRole("dialog")
      .getByRole("group", { name: "Recientes" })
    const options = recent.getByRole("option")
    await expect(options.first()).toContainText("Scripts")
    await expect(options.nth(1)).toContainText("Playbooks")
    await expect(recent.getByRole("option", { name: /API keys/ })).toHaveCount(
      0
    )
  })
})

test.describe("Buscador de la navbar (móvil)", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("el botón con icono abre el diálogo", async ({ page }) => {
    await gotoHydrated(page, "/")
    const banner = page.getByRole("banner")
    await expect(
      banner.locator('[data-slot="separator"][data-orientation="vertical"]')
    ).toBeHidden()
    await banner.getByRole("button", { name: "Buscar páginas" }).click()
    const dialog = page.getByRole("dialog", { name: "Buscar páginas" })
    await expect(dialog).toBeVisible()

    // Anchored to the top, so the keyboard (bottom half) never covers it.
    await expect(async () => {
      const box = await dialog.boundingBox()
      if (!box) throw new Error("dialog not laid out")
      expect(box.y).toBeLessThan(32)
      expect(box.y + box.height).toBeLessThan(844 / 2 + 64)
    }).toPass()
  })
})
