import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

test.describe("Grupo All integrado", () => {
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
      >(page.request, "inventory/groups/list")
      for (const group of groups) {
        const created = group.createdAt ? Date.parse(group.createdAt) : 0
        if (group.name.toLowerCase() === "all" && created >= startedAt) {
          await rpc(page.request, "inventory/groups/delete", { id: group.id })
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
      rpc<unknown[]>(page.request, "inventory/devices/list"),
      rpc<{ id: string }[]>(page.request, "playbooks/list"),
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
