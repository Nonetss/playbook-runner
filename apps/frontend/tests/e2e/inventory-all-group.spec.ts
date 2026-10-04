import { expect, type Page, test } from "@playwright/test"
import { pinLocaleTo, TEST_LOCALE, waitForHydration } from "./helpers"

/** Calls a procedure as the signed-in user (cookie + oRPC CSRF header). */
async function rpc<T>(page: Page, path: string, json: unknown = {}) {
  const response = await page.request.post(`/rpc/v1/${path}`, {
    headers: { "x-csrf-token": "orpc" },
    data: { json },
  })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { json: T }).json
}

test.describe("Grupo All integrado", () => {
  test.beforeEach(async ({ context }) => {
    await pinLocaleTo(context, TEST_LOCALE)
  })

  test("aparece el primero en Grupos aunque no haya grupos creados", async ({
    page,
  }) => {
    await page.goto("/inventory/groups")

    const groupLinks = page.locator(
      'main a[href^="/inventory/"][href$="/group"]'
    )
    await expect(groupLinks.first()).toHaveAttribute(
      "href",
      "/inventory/all/group"
    )
    await expect(groupLinks.first()).toHaveAccessibleName("All")
  })

  test("su tarjeta solo ofrece abrirlo", async ({ page }) => {
    await page.goto("/inventory/groups")
    const actions = page.getByRole("button", { name: "Acciones para All" })
    await waitForHydration(actions)
    await actions.click()

    await expect(page.getByRole("menuitem")).toHaveText(["Gestionar"])
  })

  test("su detalle es de solo lectura y lista los dispositivos", async ({
    page,
  }) => {
    await page.goto("/inventory/all/group")

    await expect(
      page.getByRole("heading", { level: 1, name: "All" })
    ).toBeVisible()
    await expect(
      page.getByText("Grupo integrado que siempre contiene todos")
    ).toBeVisible()
    await expect(page.getByRole("textbox")).toHaveCount(0)
    await expect(page.getByRole("checkbox")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /eliminar/i })).toHaveCount(0)
  })

  test("no se puede crear un grupo llamado all", async ({ page }) => {
    const startedAt = Date.now()
    await page.goto("/inventory/groups")
    const create = page.getByRole("button", { name: "Nuevo grupo" })
    await waitForHydration(create)
    await create.click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Nombre").fill("All")
    await dialog.getByRole("button", { name: "Crear grupo" }).click()

    try {
      await expect(page.getByText("No se pudo crear el grupo")).toBeVisible()
      await expect(dialog).toBeVisible()
    } finally {
      // Never leave a stray group behind if the server let it through.
      const groups = await rpc<
        { id: string; name: string; createdAt: string | null }[]
      >(page, "inventory/groups/list")
      for (const group of groups) {
        const created = group.createdAt ? Date.parse(group.createdAt) : 0
        if (group.name.toLowerCase() === "all" && created >= startedAt) {
          await rpc(page, "inventory/groups/delete", { id: group.id })
        }
      }
    }
  })

  test("el buscador lo encuentra y abre su detalle", async ({ page }) => {
    await page.goto("/inventory/devices")
    const trigger = page.getByRole("button", { name: /buscar/i }).first()
    await waitForHydration(trigger)
    await page.keyboard.press("Control+k")
    await page.getByRole("dialog").getByRole("combobox").fill("all")

    const option = page
      .getByRole("dialog")
      .getByRole("option")
      .filter({ hasText: "All" })
      .first()
    await option.click()

    await expect(page).toHaveURL(/\/inventory\/all\/group$/)
  })

  test("el selector de un run envía { type: all } y lo recuerda en la URL", async ({
    page,
  }) => {
    const [devices, playbooks] = await Promise.all([
      rpc<unknown[]>(page, "inventory/devices/list"),
      rpc<{ id: string }[]>(page, "playbooks/list"),
    ])
    test.skip(
      devices.length === 0 || playbooks.length === 0,
      "needs at least one device and one playbook"
    )

    // Abort every run call: the test only inspects the payload, nothing
    // reaches the runner.
    const payloads: unknown[] = []
    await page.route(/\/rpc\/v1\/run\//, async (route) => {
      payloads.push(route.request().postDataJSON())
      await route.abort()
    })

    await page.goto(`/playbooks/${playbooks[0]?.id}/run`)
    const allOption = page.getByRole("button", { name: /^All/ })
    await waitForHydration(allOption)
    await allOption.click()
    await expect(page).toHaveURL(/[?&]groups=all\b/)

    await page.reload()
    const run = page.getByRole("button", { name: /^Ejecutar/ })
    await waitForHydration(run)
    await expect(run).toContainText("1")
    await run.click()
    await page.getByRole("button", { name: "Iniciar ejecución" }).click()

    await expect.poll(() => payloads.length).toBe(1)
    expect(payloads[0]).toMatchObject({
      json: { inventory: [{ type: "all" }] },
    })
  })
})
