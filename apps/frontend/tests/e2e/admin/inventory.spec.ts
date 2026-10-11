import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"
import { UNREACHABLE_ADDRESS } from "@test/e2e/helpers/seed"

type Named = { id: string; name: string }

/** The section sidebar every inventory route renders, with `active` lit. */
async function expectSectionSidebar(page: Page, active?: string) {
  const sidebar = page.locator("[data-sidebar=sidebar]")
  const links = ["Dispositivos", "Grupos", "Credenciales"].map((name) =>
    sidebar.getByRole("link", { name, exact: true })
  )
  await waitForHydration(links[0] ?? sidebar)
  for (const link of links) await expect(link).toBeVisible()
  if (active) {
    await expect(
      sidebar.getByRole("link", { name: active, exact: true })
    ).toHaveAttribute("data-active", "true")
  }
}

function heading(page: Page, name: string) {
  return page.getByRole("heading", { level: 1, name, exact: true })
}

/** The card of a device or credential: its open control is a button. */
function buttonCard(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name, exact: true }) })
}

/** The card of a group: its open control is a link to the detail page. */
function groupCard(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name, exact: true }) })
}

/** Opens the row actions menu of `name` and picks `item`. */
async function pickRowAction(page: Page, name: string, item: string) {
  const trigger = page.getByRole("button", {
    name: `Acciones para ${name}`,
    exact: true,
  })
  await waitForHydration(trigger)
  await trigger.click()
  await page.getByRole("menuitem", { name: item, exact: true }).click()
}

/** Accepts the shared destructive confirm dialog for `name`. */
async function confirmDelete(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name: `Eliminar "${name}"` })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** Reads the id of a record created through the UI from its list call. */
async function idByName(page: Page, listPath: string, name: string) {
  let id: string | undefined
  await expect
    .poll(async () => {
      const records = await rpc<Named[]>(page.request, listPath)
      id = records.find((record) => record.name === name)?.id
      return id
    })
    .toBeTruthy()
  return id as string
}

async function namesIn(page: Page, listPath: string) {
  const records = await rpc<Named[]>(page.request, listPath)
  return records.map((record) => record.name)
}

test.describe("Inventario: resumen de sección", () => {
  test("muestra el título, la barra lateral y una tarjeta por página", async ({
    page,
  }) => {
    await page.goto("/inventory")

    await expect(heading(page, "Inventario")).toBeVisible()
    await expect(
      page
        .locator("main")
        .getByText("Organiza dispositivos, grupos y su alcance.")
    ).toBeVisible()
    await expectSectionSidebar(page, "Inventario")

    const main = page.locator("main")
    for (const [title, href] of [
      ["Dispositivos", "/inventory/devices"],
      ["Grupos", "/inventory/groups"],
      ["Credenciales", "/inventory/credentials"],
    ] as const) {
      await expect(
        main.getByRole("link", { name: new RegExp(`^${title}`) })
      ).toHaveAttribute("href", href)
    }
  })

  test("una tarjeta abre su página", async ({ page }) => {
    await page.goto("/inventory")
    const groups = page.locator("main").getByRole("link", { name: /^Grupos/ })
    await waitForHydration(groups)
    await groups.click()

    await expect(page).toHaveURL(/\/inventory\/groups$/)
    await expect(heading(page, "Grupos")).toBeVisible()
  })
})

test.describe("Inventario: dispositivos", () => {
  test("muestra el título, la barra lateral y un dispositivo sembrado", async ({
    page,
    seed,
  }) => {
    const group = await seed.group()
    const device = await seed.device({ description: "sembrado por e2e" })
    await seed.assign(device.id, group.id)

    await page.goto("/inventory/devices")
    await expect(heading(page, "Dispositivos")).toBeVisible()
    await expectSectionSidebar(page, "Dispositivos")

    const card = buttonCard(page, device.name)
    await expect(card).toBeVisible()
    await expect(card).toContainText("sembrado por e2e")
    await expect(card).toContainText(UNREACHABLE_ADDRESS)
    await expect(card).toContainText(group.name)
  })

  test("crear un dispositivo desde el diálogo", async ({ page, seed }) => {
    const name = seed.name("ui-dev")
    await page.goto("/inventory/devices")
    const create = page
      .getByRole("button", { name: "Nuevo dispositivo", exact: true })
      .first()
    await waitForHydration(create)
    await create.click()

    const dialog = page.getByRole("dialog", { name: "Nuevo dispositivo" })
    await dialog.getByLabel("Nombre").fill(name)
    await dialog.getByLabel("Dirección IP").fill(UNREACHABLE_ADDRESS)
    await dialog.getByLabel("Puerto SSH").fill("2222")
    await dialog.getByRole("button", { name: "Crear dispositivo" }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText("Dispositivo creado")).toBeVisible()
    const id = await idByName(page, "inventory/devices/list", name)
    seed.track("inventory/devices/delete", { id })

    await expect(buttonCard(page, name)).toContainText(
      `${UNREACHABLE_ADDRESS}:2222`
    )
  })

  test("editar un dispositivo desde su menú de acciones", async ({
    page,
    seed,
  }) => {
    const device = await seed.device()
    const description = `editado ${seed.name("desc")}`

    await page.goto("/inventory/devices")
    await pickRowAction(page, device.name, "Editar")

    const dialog = page.getByRole("dialog", { name: "Editar dispositivo" })
    await expect(dialog.getByLabel("Nombre")).toHaveValue(device.name)
    await expect(dialog.getByLabel("Dirección IP")).toHaveValue(
      UNREACHABLE_ADDRESS
    )
    await dialog.getByLabel("Descripción").fill(description)
    await dialog.getByRole("button", { name: "Guardar cambios" }).click()

    await expect(dialog).toBeHidden()
    await expect(buttonCard(page, device.name)).toContainText(description)
    const saved = await rpc<{ description: string | null }>(
      page.request,
      "inventory/devices/get",
      { id: device.id }
    )
    expect(saved.description).toBe(description)
  })

  test("eliminar un dispositivo pide confirmación", async ({ page, seed }) => {
    const device = await seed.device()

    await page.goto("/inventory/devices")
    await pickRowAction(page, device.name, "Eliminar")
    await confirmDelete(page, device.name)

    await expect(buttonCard(page, device.name)).toHaveCount(0)
    expect(await namesIn(page, "inventory/devices/list")).not.toContain(
      device.name
    )
  })

  test("el ping de un dispositivo informa de un resultado", async ({
    page,
    seed,
  }) => {
    // The target is unreachable on purpose: only the outcome is asserted.
    test.setTimeout(120_000)
    const device = await seed.device()

    await page.goto("/inventory/devices")
    await pickRowAction(page, device.name, "Ping")

    const dialog = page.getByRole("dialog", { name: `Ping — ${device.name}` })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(UNREACHABLE_ADDRESS)

    const outcome = dialog
      .getByText(/^Host (no )?alcanzable/)
      .or(dialog.getByRole("alert"))
      .first()
    await expect(outcome).toBeVisible({ timeout: 90_000 })
    await expect(
      dialog.getByRole("button", { name: "Reintentar" })
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Ejecutando…" })
    ).toHaveCount(0)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })
})

test.describe("Inventario: grupos", () => {
  test("muestra el título, la barra lateral y un grupo sembrado con sus miembros", async ({
    page,
    seed,
  }) => {
    const group = await seed.group({ description: "grupo sembrado" })
    const device = await seed.device()
    await seed.assign(device.id, group.id)

    await page.goto("/inventory/groups")
    await expect(heading(page, "Grupos")).toBeVisible()
    await expectSectionSidebar(page, "Grupos")

    const card = groupCard(page, group.name)
    await expect(card).toBeVisible()
    await expect(card).toContainText("grupo sembrado")
    await expect(card).toContainText(device.name)
    await expect(
      card.getByRole("link", { name: group.name, exact: true })
    ).toHaveAttribute("href", `/inventory/${group.id}/group`)
  })

  test("crear un grupo desde el diálogo", async ({ page, seed }) => {
    const name = seed.name("ui-grp")
    await page.goto("/inventory/groups")
    const create = page.getByRole("button", { name: "Nuevo grupo" })
    await waitForHydration(create)
    await create.click()

    const dialog = page.getByRole("dialog", { name: "Nuevo grupo" })
    await dialog.getByLabel("Nombre").fill(name)
    await dialog.getByLabel("Descripción").fill("creado desde la UI")
    await dialog.getByRole("button", { name: "Crear grupo" }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText("Grupo creado")).toBeVisible()
    const id = await idByName(page, "inventory/groups/list", name)
    seed.track("inventory/groups/delete", { id })

    const card = groupCard(page, name)
    await expect(card).toContainText("creado desde la UI")
    await expect(card.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      `/inventory/${id}/group`
    )
  })

  test("eliminar un grupo desde su menú de acciones", async ({
    page,
    seed,
  }) => {
    const group = await seed.group()

    await page.goto("/inventory/groups")
    await pickRowAction(page, group.name, "Eliminar")
    await confirmDelete(page, group.name)

    await expect(groupCard(page, group.name)).toHaveCount(0)
    expect(await namesIn(page, "inventory/groups/list")).not.toContain(
      group.name
    )
  })

  test("el detalle asigna y quita dispositivos", async ({ page, seed }) => {
    const group = await seed.group()
    const member = await seed.device()
    const outsider = await seed.device()
    await seed.assign(member.id, group.id)
    // Unassigns whatever the test leaves assigned (404s are fine).
    seed.track("inventory/deviceGroups/unassign", {
      deviceId: outsider.id,
      groupId: group.id,
    })

    await page.goto(`/inventory/${group.id}/group`)
    await expect(heading(page, group.name)).toBeVisible()
    await expectSectionSidebar(page)

    const memberBox = page.getByRole("checkbox", { name: member.name })
    const outsiderBox = page.getByRole("checkbox", { name: outsider.name })
    await waitForHydration(memberBox)
    await expect(memberBox).toBeChecked()
    await expect(outsiderBox).not.toBeChecked()

    await outsiderBox.click()
    await expect(outsiderBox).toBeChecked()
    await memberBox.click()
    await expect(memberBox).not.toBeChecked()

    await expect
      .poll(async () => {
        const relations = await rpc<{ deviceId: string }[]>(
          page.request,
          "inventory/deviceGroups/listByGroup",
          { groupId: group.id }
        )
        return relations.map((relation) => relation.deviceId)
      })
      .toEqual([outsider.id])
  })

  test("el detalle guarda la descripción", async ({ page, seed }) => {
    const group = await seed.group()
    const description = `editado ${seed.name("desc")}`

    await page.goto(`/inventory/${group.id}/group`)
    const descriptionField = page.getByLabel("Descripción")
    await waitForHydration(descriptionField)
    await expect(page.getByLabel("Nombre")).toHaveValue(group.name)

    await descriptionField.fill(description)
    await page.getByRole("button", { name: "Guardar cambios" }).click()

    await expect(page.getByText("Grupo actualizado")).toBeVisible()
    await expect
      .poll(async () => {
        const saved = await rpc<{ description: string | null }>(
          page.request,
          "inventory/groups/get",
          { id: group.id }
        )
        return saved.description
      })
      .toBe(description)

    await page.reload()
    await expect(page.getByLabel("Descripción")).toHaveValue(description)
  })

  test("el detalle elimina el grupo y vuelve a Grupos", async ({
    page,
    seed,
  }) => {
    const group = await seed.group()

    await page.goto(`/inventory/${group.id}/group`)
    const remove = page.getByRole("button", { name: "Eliminar", exact: true })
    await waitForHydration(remove)
    await remove.click()
    await confirmDelete(page, group.name)

    await expect(page).toHaveURL(/\/inventory\/groups$/)
    await expect(groupCard(page, group.name)).toHaveCount(0)
    expect(await namesIn(page, "inventory/groups/list")).not.toContain(
      group.name
    )
  })
})

test.describe("Inventario: credenciales", () => {
  test("muestra el título, la barra lateral y una credencial sembrada", async ({
    page,
    seed,
  }) => {
    const credential = await seed.credential()

    await page.goto("/inventory/credentials")
    await expect(heading(page, "Credenciales")).toBeVisible()
    await expectSectionSidebar(page, "Credenciales")

    const card = buttonCard(page, credential.name)
    await expect(card).toBeVisible()
    await expect(card).toContainText("ansible")
    await expect(card).toContainText("ssh-ed25519")
  })

  test("crear una credencial generando el par de claves no vuelve a mostrar la clave privada", async ({
    page,
    seed,
  }) => {
    const name = seed.name("ui-cred")
    await page.goto("/inventory/credentials")
    const create = page
      .getByRole("button", { name: "Nueva credencial", exact: true })
      .first()
    await waitForHydration(create)
    await create.click()

    const dialog = page.getByRole("dialog", { name: "Nueva credencial" })
    await dialog.getByRole("tab", { name: "Generar nueva clave" }).click()
    await dialog.getByLabel("Nombre").fill(name)
    await dialog.getByLabel("Usuario").fill("deploy")

    const generated = page.waitForResponse((response) =>
      response.url().includes("/rpc/v1/credentials/generate")
    )
    await dialog.getByRole("button", { name: "Generar par de claves" }).click()
    const pair = (
      (await (await generated).json()) as {
        json: { privateKey: string; publicKey: string }
      }
    ).json

    // Generating shows the public key only, never the private one.
    await expect(dialog.getByLabel("Clave pública")).toHaveValue(pair.publicKey)
    await expect(dialog.getByLabel("Clave privada")).toHaveCount(0)
    await dialog.getByRole("button", { name: "Crear credencial" }).click()

    await expect(dialog).toBeHidden()
    const id = await idByName(page, "credentials/list", name)
    seed.track("credentials/delete", { id })
    await expect(buttonCard(page, name)).toContainText("deploy")

    // The API and the edit dialog never return the stored private key.
    const listed = await rpc<Record<string, unknown>[]>(
      page.request,
      "credentials/list"
    )
    expect(
      listed.find((credential) => credential.id === id)
    ).not.toHaveProperty("privateKey")

    await buttonCard(page, name)
      .getByRole("button", { name, exact: true })
      .click()
    const edit = page.getByRole("dialog", { name: "Editar credencial" })
    await expect(edit.getByLabel("Clave privada")).toHaveValue("")
    await expect(
      edit.getByText("Déjalo vacío para conservar la clave privada actual.")
    ).toBeVisible()
    await expect(edit.getByLabel("Clave pública")).toHaveValue(pair.publicKey)

    const secret = pair.privateKey
      .split("\n")
      .find((line) => line.length > 0 && !line.startsWith("-----"))
    expect(secret).toBeTruthy()
    await expect(page.locator("body")).not.toContainText(secret as string)
    for (const field of await page.getByRole("textbox").all()) {
      expect(await field.inputValue()).not.toContain(secret as string)
    }
  })

  test("eliminar una credencial pide confirmación", async ({ page, seed }) => {
    const credential = await seed.credential()

    await page.goto("/inventory/credentials")
    await pickRowAction(page, credential.name, "Eliminar")
    await confirmDelete(page, credential.name)

    await expect(buttonCard(page, credential.name)).toHaveCount(0)
    expect(await namesIn(page, "credentials/list")).not.toContain(
      credential.name
    )
  })
})
