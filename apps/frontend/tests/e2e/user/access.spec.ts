import { expect, test } from "@test/e2e/fixtures"
import { REGULAR_USER } from "@test/e2e/helpers/auth"
import { waitForHydration } from "@test/e2e/helpers/hydration"

/** Product pages every signed-in, non-pending account may open. */
const REGULAR_SURFACES = [
  { path: "/inventory/devices", title: "Dispositivos" },
  { path: "/inventory/groups", title: "Grupos" },
  { path: "/inventory/credentials", title: "Credenciales" },
  { path: "/playbooks", title: "Playbooks" },
  { path: "/jobs/scheduler", title: "Scheduler" },
  { path: "/jobs/history", title: "Historial" },
  { path: "/scripts", title: "Scripts" },
  { path: "/commands", title: "Comandos" },
  { path: "/config", title: "API keys" },
]

test.describe("Usuario sin rol de administrador", () => {
  test("/admin/users lo devuelve al inicio", async ({ page }) => {
    await page.goto("/admin/users")

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/)
    await expect(
      page.getByRole("heading", { level: 1, name: /bienvenido/i })
    ).toBeVisible()
  })

  test("la API de administración de usuarios lo rechaza", async ({ page }) => {
    await page.goto("/me")

    const status = await page.evaluate(async () => {
      const response = await fetch("/api/auth/admin/list-users")
      return response.status
    })

    expect([401, 403]).toContain(status)
  })

  test("el menú de cuenta muestra su email y no ofrece Usuarios", async ({
    page,
  }) => {
    await page.goto("/")
    const accountMenu = page.getByRole("button", { name: "Menú de cuenta" })
    await waitForHydration(accountMenu)
    await accountMenu.click()

    const menu = page.getByRole("menu")
    await expect(menu).toContainText(REGULAR_USER.email)
    await expect(
      menu.getByRole("menuitem", { name: "Mi perfil" })
    ).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "Usuarios" })).toHaveCount(
      0
    )
  })

  test("su perfil lo muestra con el rol Usuario", async ({ page }) => {
    await page.goto("/me")

    await expect(
      page.getByRole("heading", { level: 1, name: "Mi perfil" })
    ).toBeVisible()
    await expect(page.getByText(REGULAR_USER.email)).toBeVisible()
    await expect(page.getByText("Usuario", { exact: true })).toBeVisible()
  })

  for (const { path, title } of REGULAR_SURFACES) {
    test(`puede abrir ${path}`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(
        page.getByRole("heading", { level: 1, name: title, exact: true })
      ).toBeVisible()
    })
  }

  test("puede trabajar con los recursos: ve un script que ha creado", async ({
    page,
    seed,
  }) => {
    const script = await seed.script()

    await page.goto("/scripts")

    await expect(page.getByText(script.name, { exact: true })).toBeVisible()
  })
})
