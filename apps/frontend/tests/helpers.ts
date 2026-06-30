import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Waits for the React island that contains `child` to finish hydrating.
 *
 * Islands are mounted with `client:load`. Interacting (filling, clicking)
 * before hydration lands on the static SSR DOM and is lost: controlled inputs
 * submit empty and button handlers never fire. Astro removes the `ssr`
 * attribute and adds `client-render-time` to the `<astro-island>` once it
 * hydrates, so we wait for that signal before touching the component.
 */
export async function waitForHydration(child: Locator) {
  await expect(
    child.page().locator("astro-island", { has: child })
  ).toHaveAttribute("client-render-time", /\d/)
}

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
