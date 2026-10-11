import { expect, test as setup } from "@playwright/test"
import {
  ADMIN_STATE,
  ADMIN_USER,
  REGULAR_USER,
  signInThroughForm,
  USER_STATE,
} from "@test/e2e/helpers/auth"
import { pinLocaleTo, TEST_LOCALE } from "@test/e2e/helpers/locale"

setup(
  "authenticate the seeded admin and the regular user",
  async ({ browser, page, context }) => {
    setup.setTimeout(60_000)
    await pinLocaleTo(context, TEST_LOCALE)
    await page.goto("/login")
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /iniciar sesión/i })
    ).toBeVisible()
    await signInThroughForm(page, ADMIN_USER)
    await context.storageState({ path: ADMIN_STATE })

    // Public sign-up is disabled: the admin creates the regular account, once.
    // A same-origin fetch from the signed-in page carries the session cookie
    // and the Origin header Better Auth checks.
    const created = await page.evaluate(async (user) => {
      const response = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...user, role: "user" }),
      })
      return { status: response.status, body: await response.text() }
    }, REGULAR_USER)
    const alreadyExists = /already exists|USER_ALREADY_EXISTS/i.test(
      created.body
    )
    expect(
      created.status === 200 || alreadyExists,
      `create-user answered ${created.status}: ${created.body}`
    ).toBe(true)

    const userContext = await browser.newContext()
    await pinLocaleTo(userContext, TEST_LOCALE)
    const userPage = await userContext.newPage()
    await signInThroughForm(userPage, REGULAR_USER)
    await userContext.storageState({ path: USER_STATE })
    await userContext.close()
  }
)
