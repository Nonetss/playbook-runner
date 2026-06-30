import { expect, test } from "@playwright/test"
import { waitForHydration } from "./helpers"

test.describe("NavbarMobileMenu", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("banner")).toBeVisible()
    await waitForHydration(
      page.getByRole("button", { name: /abrir menú de navegación/i })
    )
  })

  test("renderiza el trigger con la etiqueta accesible correcta", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: /abrir menú de navegación/i,
    })
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute("type", "button")
  })

  test("abre el panel y muestra los links de navegación", async ({ page }) => {
    await page
      .getByRole("button", { name: /abrir menú de navegación/i })
      .click()

    const menuNav = page.getByRole("navigation", {
      name: /enlaces principales/i,
    })
    await expect(menuNav).toBeVisible()

    for (const label of [
      "Inicio",
      "Credenciales",
      "Inventario",
      "Playbooks",
      "Jobs",
    ]) {
      await expect(
        menuNav.getByRole("link", { name: label, exact: true })
      ).toBeVisible()
    }
  })

  test("marca con estilo activo el link del path actual", async ({ page }) => {
    await page.goto("/inventory")
    const trigger = page.getByRole("button", {
      name: /abrir menú de navegación/i,
    })
    await waitForHydration(trigger)
    await trigger.click()

    const activeLink = page
      .getByRole("navigation", { name: /enlaces principales/i })
      .getByRole("link", { name: "Inventario", exact: true })

    await expect(activeLink).toHaveClass(/bg-secondary/)
    await expect(activeLink).toHaveAttribute("href", "/inventory")
  })

  test("click en un link cierra el panel y navega", async ({ page }) => {
    await page
      .getByRole("button", { name: /abrir menú de navegación/i })
      .click()

    const menuNav = page.getByRole("navigation", {
      name: /enlaces principales/i,
    })
    await menuNav
      .getByRole("link", { name: "Credenciales", exact: true })
      .click()

    await page.waitForURL(/\/credentials$/)
    await expect(menuNav).toBeHidden()
  })

  test("al cambiar de tamaño a lg+ la navbar de escritorio aparece", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /abrir menú de navegación/i })
    ).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 720 })

    await expect(
      page.getByRole("button", { name: /abrir menú de navegación/i })
    ).toBeHidden()
    await expect(
      page
        .getByRole("banner")
        .locator("ul")
        .first()
        .getByRole("link", { name: "Playbooks", exact: true })
    ).toBeVisible()
  })
})
