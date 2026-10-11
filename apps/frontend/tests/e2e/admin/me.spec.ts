import { expect, test } from "@test/e2e/fixtures"
import { ADMIN_USER } from "@test/e2e/helpers/auth"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { TEST_LOCALE } from "@test/e2e/helpers/locale"

test.describe("Mi perfil (administrador)", () => {
  test("muestra el email, el rol y el id de la cuenta", async ({ page }) => {
    await page.goto("/me")

    await expect(
      page.getByRole("heading", { level: 1, name: "Mi perfil", exact: true })
    ).toBeVisible()
    await expect(page.getByText("Tu cuenta y tu sesión.")).toBeVisible()

    const main = page.getByRole("main")
    await expect(
      main.getByText("Administrador", { exact: true }).first()
    ).toBeVisible()
    await expect(
      main.getByText(ADMIN_USER.email, { exact: true }).first()
    ).toBeVisible()
    for (const label of ["Nombre", "Email", "ID de cuenta", "Miembro desde"]) {
      await expect(main.getByText(label, { exact: true })).toBeVisible()
    }
    // The account id shown is the signed-in session's.
    const response = await page.request.get("/api/auth/get-session")
    expect(response.ok()).toBe(true)
    const { user } = (await response.json()) as { user: { id: string } }
    await expect(main.getByText(user.id, { exact: true })).toBeVisible()
  })

  test("el menú de cuenta lleva a la página de perfil", async ({ page }) => {
    await page.goto("/")
    const accountMenu = page.getByRole("button", { name: "Menú de cuenta" })
    await waitForHydration(accountMenu)
    await accountMenu.click()

    await page.getByRole("menuitem", { name: "Mi perfil" }).click()

    await expect(page).toHaveURL(/\/me$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Mi perfil", exact: true })
    ).toBeVisible()
  })

  test("cambiar el idioma traduce el perfil y se puede volver al español", async ({
    page,
    context,
  }) => {
    await page.goto("/me")
    const switcher = page
      .getByRole("banner")
      .getByTestId("language-switcher-trigger")
      .filter({ visible: true })
    await waitForHydration(switcher)

    await switcher.click()
    await page.getByTestId("language-option-en").click()
    await expect(
      page.getByRole("heading", { level: 1, name: "My profile", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("main").getByText("Administrator", { exact: true })
    ).toBeVisible()

    await switcher.click()
    await page.getByTestId(`language-option-${TEST_LOCALE}`).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Mi perfil", exact: true })
    ).toBeVisible()
    await expect
      .poll(
        async () =>
          (await context.cookies()).find((c) => c.name === "locale")?.value
      )
      .toBe(TEST_LOCALE)
  })
})
