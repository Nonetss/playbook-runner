import { expect, test } from "@playwright/test"
import { fillSignInForm, pinLocaleTo, TEST_LOCALE } from "./helpers"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@playbook-runner.local"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234"

test("authenticate as seeded admin user", async ({ page, context }) => {
  await pinLocaleTo(context, TEST_LOCALE)
  await page.goto("/login")
  await expect(
    page.locator('[data-slot="card-title"]', { hasText: /iniciar sesión/i })
  ).toBeVisible()

  await fillSignInForm(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await page.getByRole("button", { name: /^iniciar sesión$/i }).click()

  await page.waitForURL(/^http:\/\/localhost:4321\/$/, { timeout: 15_000 })
  await expect(page.getByRole("banner")).toBeVisible()

  await page.context().storageState({ path: "playwright/.auth/admin.json" })
})
