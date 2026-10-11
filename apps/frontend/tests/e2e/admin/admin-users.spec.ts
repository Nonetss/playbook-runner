import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { ADMIN_USER, REGULAR_USER } from "@test/e2e/helpers/auth"
import { waitForHydration } from "@test/e2e/helpers/hydration"

/** The card of one account, by its (unique) email. */
function userCard(page: Page, email: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByText(email, { exact: true }) })
}

/**
 * The page offers no deletion, so accounts a test creates are removed through
 * Better Auth's admin API. A same-origin fetch from the signed-in page carries
 * the session cookie and the Origin header Better Auth checks.
 */
async function removeUsersByEmail(page: Page, email: string) {
  if (!page.url().startsWith("http")) await page.goto("/me")
  const failure = await page.evaluate(async (target) => {
    const params = new URLSearchParams({
      searchField: "email",
      searchOperator: "contains",
      searchValue: target,
      limit: "10",
    })
    const list = await fetch(`/api/auth/admin/list-users?${params}`)
    if (!list.ok) return `list-users answered ${list.status}`
    const { users } = (await list.json()) as {
      users: { id: string; email: string }[]
    }
    for (const user of users.filter((row) => row.email === target)) {
      const removed = await fetch("/api/auth/admin/remove-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!removed.ok) return `remove-user answered ${removed.status}`
    }
    return null
  }, email)
  expect(failure, failure ?? undefined).toBeNull()
}

test.describe("Administración de usuarios", () => {
  test("lista al administrador y al usuario regular", async ({ page }) => {
    await page.goto("/admin/users")

    await expect(
      page.getByRole("heading", { level: 1, name: "Usuarios", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Gestiona las cuentas y sus roles.")
    ).toBeVisible()

    const admin = userCard(page, ADMIN_USER.email)
    await expect(admin).toBeVisible()
    await expect(admin).toContainText("(tú)")
    // An admin can't change their own role.
    const adminRole = admin.getByRole("combobox", { name: /^Rol de / })
    await expect(adminRole).toContainText("Administrador")
    await expect(adminRole).toBeDisabled()

    const regular = userCard(page, REGULAR_USER.email)
    await expect(regular).toBeVisible()
    await expect(
      regular.getByRole("combobox", { name: `Rol de ${REGULAR_USER.name}` })
    ).toContainText("Usuario")
  })

  test("crea un usuario desde el diálogo y lo bloquea", async ({
    page,
    seed,
  }) => {
    const email = `${seed.name("user")}@playbook-runner.test`
    const name = seed.name("Usuario")

    try {
      await page.goto("/admin/users")
      const open = page.getByRole("button", { name: "Nuevo usuario" })
      await waitForHydration(open)
      await open.click()

      const dialog = page.getByRole("dialog", { name: "Crear usuario" })
      await dialog.getByLabel("Nombre", { exact: true }).fill(name)
      await dialog.getByLabel("Email", { exact: true }).fill(email)
      await dialog
        .getByLabel("Contraseña (mín. 8 caracteres)", { exact: true })
        .fill("e2e-password-1234")
      await expect(dialog.getByRole("combobox")).toContainText("Usuario")
      await dialog.getByRole("button", { name: "Crear usuario" }).click()

      await expect(dialog).toBeHidden()
      const card = userCard(page, email)
      await expect(card).toBeVisible()
      await expect(card).toContainText(name)
      await expect(
        card.getByRole("combobox", { name: `Rol de ${name}` })
      ).toContainText("Usuario")

      await card.getByRole("button", { name: `Acciones para ${name}` }).click()
      await page.getByRole("menuitem", { name: "Bloquear" }).click()
      await expect(card).toContainText("Bloqueado")
    } finally {
      await removeUsersByEmail(page, email)
    }

    await page.reload()
    await expect(userCard(page, ADMIN_USER.email)).toBeVisible()
    await expect(userCard(page, email)).toHaveCount(0)
  })
})
