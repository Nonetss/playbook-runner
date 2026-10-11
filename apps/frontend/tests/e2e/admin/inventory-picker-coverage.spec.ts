import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

type Fixtures = {
  prefix: string
  group: { id: string; name: string }
  /** `a` and `b` belong to the group, `c` doesn't. */
  devices: Record<"a" | "b" | "c", { id: string; name: string }>
}

/** One group with two member devices plus an outsider, all uniquely named. */
async function createFixtures(page: Page): Promise<Fixtures> {
  const prefix = `e2e-cov-${Date.now()}`
  const group = await rpc<{ id: string; name: string }>(
    page.request,
    "inventory/groups/create",
    { name: `${prefix}-g` }
  )
  const devices = {} as Fixtures["devices"]
  for (const [index, key] of (["a", "b", "c"] as const).entries()) {
    devices[key] = await rpc(page.request, "inventory/devices/create", {
      name: `${prefix}-${key}`,
      ipAddress: `192.0.2.${10 + index}`,
    })
  }
  for (const device of [devices.a, devices.b]) {
    await rpc(page.request, "inventory/deviceGroups/assign", {
      deviceId: device.id,
      groupId: group.id,
    })
  }
  return { prefix, group, devices }
}

async function deleteFixtures(page: Page, fixtures: Fixtures | undefined) {
  if (!fixtures) return
  for (const device of Object.values(fixtures.devices)) {
    await rpc(page.request, "inventory/devices/delete", { id: device.id })
  }
  await rpc(page.request, "inventory/groups/delete", { id: fixtures.group.id })
}

function row(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^${name}`) })
}

test.describe("Selector de inventario: dispositivos cubiertos por un grupo", () => {
  let fixtures: Fixtures | undefined

  test.beforeEach(async ({ page }) => {
    fixtures = await createFixtures(page)
  })

  test.afterEach(async ({ page }) => {
    await deleteFixtures(page, fixtures)
    fixtures = undefined
  })

  test("marcar un grupo marca y bloquea sus dispositivos", async ({ page }) => {
    const { prefix, group, devices } = fixtures as Fixtures
    await page.goto("/commands")
    const search = page.getByPlaceholder("Buscar…", { exact: true })
    await waitForHydration(search)
    await search.fill(prefix)

    const groupRow = row(page, group.name)
    const a = row(page, devices.a.name)
    const b = row(page, devices.b.name)
    const c = row(page, devices.c.name)

    // A direct pick of `a` must survive the group being toggled on and off.
    await a.click()
    await expect(a).toHaveAttribute("aria-pressed", "true")
    await expect(a).not.toHaveAttribute("aria-disabled")

    await groupRow.click()
    for (const member of [a, b]) {
      await expect(member).toHaveAttribute("aria-pressed", "true")
      await expect(member).toHaveAttribute("aria-disabled", "true")
      await expect(member).toContainText(`incluido por ${group.name}`)
    }
    await expect(c).toHaveAttribute("aria-pressed", "false")

    // Clicking a covered device changes nothing (force: it's aria-disabled).
    await b.click({ force: true })
    await expect(b).toHaveAttribute("aria-pressed", "true")

    await c.click()
    await expect(
      page.getByRole("button", { name: /^Dispositivos/ })
    ).toContainText("3/3")

    await groupRow.click()
    await expect(a).toHaveAttribute("aria-pressed", "true")
    await expect(a).not.toHaveAttribute("aria-disabled")
    await expect(a).not.toContainText("incluido por")
    await expect(b).toHaveAttribute("aria-pressed", "false")
    await expect(c).toHaveAttribute("aria-pressed", "true")
  })

  test("el run de un playbook envía solo el grupo", async ({ page }) => {
    const { prefix, group, devices } = fixtures as Fixtures
    const playbooks = await rpc<{ id: string }[]>(
      page.request,
      "playbooks/list"
    )
    test.skip(playbooks.length === 0, "needs at least one playbook")

    // Abort every run call: the test only inspects the payload.
    const payloads: unknown[] = []
    await page.route(/\/rpc\/v1\/run\//, async (route) => {
      payloads.push(route.request().postDataJSON())
      await route.abort()
    })

    await page.goto(`/playbooks/${playbooks[0]?.id}/run`)
    const search = page.getByPlaceholder("Buscar…", { exact: true })
    await waitForHydration(search)
    await search.fill(prefix)
    await row(page, group.name).click()
    await expect(row(page, devices.a.name)).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await expect(page).toHaveURL(new RegExp(`[?&]groups=${group.id}\\b`))
    expect(new URL(page.url()).searchParams.has("devices")).toBe(false)

    await page.getByRole("button", { name: /^Ejecutar/ }).click()
    await page.getByRole("button", { name: "Iniciar ejecución" }).click()

    await expect.poll(() => payloads.length).toBe(1)
    expect(payloads[0]).toMatchObject({
      json: { inventory: [{ id: group.id, type: "group" }] },
    })
  })

  test("editar un job que apunta al grupo muestra sus dispositivos", async ({
    page,
  }) => {
    const { prefix, group, devices } = fixtures as Fixtures
    const job = await rpc<{ id: string }>(page.request, "jobs/create", {
      name: `${prefix}-job`,
      inventoryJson: [{ id: group.id, type: "group" }],
      cronExpression: "0 0 1 1 *",
      enabled: false,
    })

    try {
      await page.goto(`/jobs/${job.id}/edit`)
      const search = page.getByPlaceholder("Buscar…", { exact: true })
      await waitForHydration(search)
      await search.fill(prefix)

      await expect(row(page, group.name)).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      for (const member of [devices.a, devices.b]) {
        await expect(row(page, member.name)).toHaveAttribute(
          "aria-disabled",
          "true"
        )
        await expect(row(page, member.name)).toContainText(
          `incluido por ${group.name}`
        )
      }
      await expect(row(page, devices.c.name)).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    } finally {
      await rpc(page.request, "jobs/delete", { id: job.id })
    }
  })
})
