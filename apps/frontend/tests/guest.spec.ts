import { expect, test } from "@playwright/test"
import {
  fillSignInForm,
  pinLocaleTo,
  TEST_LOCALE,
  waitForHydration,
} from "./helpers"

test.describe("Visitantes sin sesión", () => {
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("la raíz redirige a /login", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" })
    expect(response, "el servidor debe responder").not.toBeNull()
    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /iniciar sesión/i })
    ).toBeVisible()
  })

  test("/signup redirige a /login", async ({ page }) => {
    await page.goto("/signup")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("/dashboard redirige a la raíz y termina en /login", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("navbar de invitado muestra logo y theme toggle", async ({ page }) => {
    await page.goto("/login")
    const banner = page.getByRole("banner")
    await expect(banner).toBeVisible()
    await expect(
      banner.getByRole("link", { name: /playbook runner/i })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /cambiar tema/i })
    ).toBeVisible()
  })
})

test.describe("Formulario de login", () => {
  test.beforeEach(async ({ page, context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
    await page.goto("/login")
  })

  test("renderiza todos los campos requeridos", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /^iniciar sesión$/i })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /iniciar sesión con sso/i })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /¿no tienes cuenta\? regístrate/i })
    ).toHaveAttribute("href", "/signup")
  })

  test("credenciales inválidas muestran error visible", async ({ page }) => {
    await fillSignInForm(page, "nope@example.com", "wrongpass1")
    await page.getByRole("button", { name: /^iniciar sesión$/i }).click()

    const error = page.locator("p.text-destructive")
    await expect(error).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login$/)
  })

  test("la validación HTML5 bloquea el envío con campos vacíos", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /^iniciar sesión$/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe("Theme toggle (visitante)", () => {
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("alterna la clase dark en <html> y persiste en localStorage", async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    // clearCookies also drops the pinned `locale` cookie, so re-pin it before
    // navigating; otherwise the navbar renders in the browser-default language
    // and the Spanish `/cambiar tema/i` label no longer matches.
    await pinLocaleTo(context, TEST_LOCALE)
    await page.goto("/login")

    const html = page.locator("html")
    await expect(html).not.toHaveClass(/dark/)

    const themeToggle = page.getByRole("button", { name: /cambiar tema/i })
    await waitForHydration(themeToggle)

    await themeToggle.click()
    await expect(html).toHaveClass(/dark/)
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "dark"
    )

    await themeToggle.click()
    await expect(html).not.toHaveClass(/dark/)
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "light"
    )
  })

  test("lee el tema guardado antes del primer render", async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => {
      localStorage.setItem("theme", "dark")
    })
    await page.goto("/login")
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})

test.describe("Language switcher", () => {
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("cambia el texto de la página a inglés y persiste la cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/login")
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /iniciar sesión/i })
    ).toBeVisible()

    const switcher = page.getByTestId("language-switcher-trigger")
    await switcher.click()
    await page.getByTestId("language-option-en").click()

    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /^sign in$/i })
    ).toBeVisible()

    const cookies = await context.cookies()
    const localeCookie = cookies.find((c) => c.name === "locale")
    expect(localeCookie?.value).toBe("en")
  })
})
