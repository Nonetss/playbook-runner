import { expect, test } from "@test/e2e/fixtures"
import { fillSignInForm } from "@test/e2e/helpers/auth"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { pinLocaleTo, TEST_LOCALE } from "@test/e2e/helpers/locale"
import { rpcStatus } from "@test/e2e/helpers/rpc"

test.describe("Visitantes sin sesión", () => {
  test("la raíz redirige a /login", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" })
    expect(response, "el servidor debe responder").not.toBeNull()
    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /iniciar sesión/i })
    ).toBeVisible()
  })

  /** One route per protected route group: each sends a guest to /login. */
  const PROTECTED_ROUTES = [
    "/inventory",
    "/inventory/devices",
    "/inventory/groups",
    "/inventory/credentials",
    "/ansible",
    "/playbooks",
    "/playbooks/new",
    "/jobs/scheduler",
    "/jobs/new",
    "/jobs/history",
    "/bash",
    "/scripts",
    "/scripts/new",
    "/commands",
    "/config",
    "/admin/users",
    "/me",
  ]

  for (const path of PROTECTED_ROUTES) {
    test(`${path} redirige a /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    })
  }

  test("la API rechaza sus llamadas con 401", async ({ page }) => {
    for (const path of ["playbooks/list", "inventory/devices/list"]) {
      expect(await rpcStatus(page.request, path)).toBe(401)
    }
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
    // Public sign-up is disabled: no link, just a hint to ask an admin.
    await expect(page.getByRole("link", { name: /regístrate/i })).toHaveCount(0)
    await expect(page.getByText(/pide a un administrador/i)).toBeVisible()
  })

  test("el botón de SSO solo aparece si el backend lo tiene configurado", async ({
    page,
  }) => {
    // Cookie-less calls still need the CSRF header the oRPC link sends.
    const res = await page.request.get("/api/v1/authConfig/get", {
      headers: { "x-csrf-token": "orpc" },
    })
    expect(res.ok()).toBe(true)
    const { ssoEnabled } = (await res.json()) as { ssoEnabled: boolean }

    // Wait for the form so the SSO check runs after the island rendered.
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /iniciar sesión con sso/i })
    ).toHaveCount(ssoEnabled ? 1 : 0)
  })

  test("credenciales inválidas muestran error visible", async ({ page }) => {
    await fillSignInForm(page, "nope@example.com", "wrongpass1")
    await page.getByRole("button", { name: /^iniciar sesión$/i }).click()

    const error = page.getByRole("alert")
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
