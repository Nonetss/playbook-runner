import { expect, type Page } from "@playwright/test"
import { waitForHydration } from "@test/e2e/helpers/hydration"

export type TestUser = { email: string; password: string; name: string }

/** The admin the backend seeds at start (`SEED_ADMIN_*`). */
export const ADMIN_USER: TestUser = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@playbook-runner.local",
  password: process.env.E2E_ADMIN_PASSWORD ?? "admin1234",
  name: "Admin",
}

/**
 * The one non-admin account the suite keeps: `auth.setup.ts` creates it
 * through the admin API only when it does not exist yet.
 */
export const REGULAR_USER: TestUser = {
  email: "e2e-user@playbook-runner.local",
  password: "e2e-password-1234",
  name: "E2E User",
}

/** Where `auth.setup.ts` saves each account's signed-in browser state. */
export const ADMIN_STATE = "playwright/.auth/admin.json"
export const USER_STATE = "playwright/.auth/user.json"

/** Fills the sign-in form once its island has hydrated. */
export async function fillSignInForm(
  page: Page,
  email: string,
  password: string
) {
  const emailField = page.getByLabel("Email")
  const passwordField = page.getByLabel("Contraseña")

  await waitForHydration(emailField)

  await emailField.fill(email)
  await passwordField.fill(password)
  await expect(emailField).toHaveValue(email)
  await expect(passwordField).toHaveValue(password)
}

/** Signs `user` in through the login page and waits for the dashboard. */
export async function signInThroughForm(page: Page, user: TestUser) {
  await page.goto("/login")
  await fillSignInForm(page, user.email, user.password)
  await page.getByRole("button", { name: /^iniciar sesión$/i }).click()
  await page.waitForURL(/^http:\/\/localhost:\d+\/$/, { timeout: 15_000 })
  await expect(page.getByRole("banner")).toBeVisible()
}
