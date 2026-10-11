import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

type ScriptRow = { id: string; name: string; language: string | null }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function sidebar(page: Page) {
  return page.locator("[data-sidebar=sidebar]")
}

/** The card of one script in the `/scripts` grid, by its exact name. */
function scriptCard(page: Page, name: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name, exact: true }) })
}

/** The CodeMirror content area (`.cm-content`, labelled "Contenido"). */
function contentEditor(page: Page) {
  return page.getByRole("textbox", { name: "Contenido", exact: true })
}

/** Replaces the whole editor document with `text` by typing it. */
async function typeIntoEditor(page: Page, text: string) {
  const editor = contentEditor(page)
  await editor.click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.press("Delete")
  await page.keyboard.type(text)
  await expect(editor).toHaveText(text)
}

test.describe("Sección Bash", () => {
  test("la portada muestra su cabecera, la barra lateral y sus páginas", async ({
    page,
  }) => {
    await page.goto("/bash")

    await expect(
      page.getByRole("heading", { level: 1, name: "Bash", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Scripts reutilizables y comandos remotos puntuales.")
    ).toBeVisible()

    const scriptsLink = sidebar(page).getByRole("link", {
      name: "Scripts",
      exact: true,
    })
    await waitForHydration(scriptsLink)
    await expect(
      sidebar(page).getByRole("link", { name: "Comandos", exact: true })
    ).toBeVisible()

    const main = page.getByRole("main")
    await expect(
      main.getByRole("heading", { level: 2, name: "Comandos", exact: true })
    ).toBeVisible()
    const scriptsCard = main
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: "Scripts" }) })
    await waitForHydration(scriptsCard)
    await scriptsCard.click()

    await expect(page).toHaveURL(/\/scripts$/)
  })
})

test.describe("Scripts", () => {
  test("el listado muestra la cabecera, la barra lateral y un script sembrado", async ({
    page,
    seed,
  }) => {
    const script = await seed.script({ description: "Script sembrado e2e" })
    await page.goto("/scripts")

    await expect(
      page.getByRole("heading", { level: 1, name: "Scripts", exact: true })
    ).toBeVisible()
    const activeLink = sidebar(page).getByRole("link", {
      name: "Scripts",
      exact: true,
    })
    await waitForHydration(activeLink)
    await expect(activeLink).toHaveAttribute("data-active", "true")
    await expect(
      page.getByRole("link", { name: "Nuevo script" }).first()
    ).toBeVisible()

    const card = scriptCard(page, script.name)
    await expect(card).toBeVisible()
    await expect(card).toContainText("Script sembrado e2e")
    await expect(card).toContainText("bash")
    await expect(card.getByRole("link", { name: "Ejecutar" })).toHaveAttribute(
      "href",
      `/scripts/${script.id}/run`
    )
  })

  test("crea un script python desde /scripts/new", async ({ page, seed }) => {
    const name = seed.name("ui-script")
    const content = "import sys"

    try {
      await page.goto("/scripts/new")
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Nuevo script",
          exact: true,
        })
      ).toBeVisible()

      const nameField = page.getByLabel("Nombre", { exact: true })
      await waitForHydration(nameField)
      const submit = page.getByRole("button", { name: "Crear script" })
      await expect(submit).toBeDisabled()

      await nameField.fill(name)
      await page.getByLabel("Descripción", { exact: true }).fill("Creado e2e")

      const languages = page.getByRole("radiogroup", { name: "Lenguaje" })
      await expect(
        languages.getByRole("radio", { name: "bash", exact: true })
      ).toHaveAttribute("aria-checked", "true")
      await languages
        .getByRole("radio", { name: "python", exact: true })
        .click()
      await expect(
        languages.getByRole("radio", { name: "python", exact: true })
      ).toHaveAttribute("aria-checked", "true")
      await expect(
        page.getByText("Ejecuta el script con python3.", { exact: false })
      ).toBeVisible()

      await typeIntoEditor(page, content)
      await expect(submit).toBeEnabled()
      await submit.click()

      await expect(page).toHaveURL(/\/scripts$/)
      const card = scriptCard(page, name)
      await expect(card).toBeVisible()
      await expect(card).toContainText("python")

      const created = (await rpc<ScriptRow[]>(page.request, "scripts/list"))
        .filter((script) => script.name === name)
        .at(0)
      expect(created?.language).toBe("python")
    } finally {
      // Delete whatever the UI created, even if an assertion failed.
      const scripts = await rpc<ScriptRow[]>(page.request, "scripts/list")
      for (const script of scripts.filter((row) => row.name === name)) {
        seed.track("scripts/delete", { id: script.id })
      }
    }
  })

  test("edita un script sembrado", async ({ page, seed }) => {
    const script = await seed.script()
    const renamed = `${script.name}-editado`

    await page.goto(`/scripts/${script.id}/edit`)
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Editar script",
        exact: true,
      })
    ).toBeVisible()

    const nameField = page.getByLabel("Nombre", { exact: true })
    await waitForHydration(nameField)
    await expect(nameField).toHaveValue(script.name)
    await expect(contentEditor(page)).toHaveText("uptime")

    await nameField.fill(renamed)
    await typeIntoEditor(page, "hostname")
    await page.getByRole("button", { name: "Guardar cambios" }).click()

    await expect(page).toHaveURL(/\/scripts$/)
    await expect(scriptCard(page, renamed)).toBeVisible()

    const stored = await rpc<{ name: string; content: string }>(
      page.request,
      "scripts/get",
      { id: script.id }
    )
    expect(stored.name).toBe(renamed)
    expect(stored.content.trim()).toBe("hostname")
  })

  test("elimina un script desde su menú tras confirmar", async ({
    page,
    seed,
  }) => {
    const script = await seed.script()
    await page.goto("/scripts")

    const actions = page.getByRole("button", {
      name: `Acciones para ${script.name}`,
    })
    await waitForHydration(actions)
    await actions.click()
    await page.getByRole("menuitem", { name: "Eliminar" }).click()

    const dialog = page.getByRole("dialog", {
      name: `Eliminar "${script.name}"`,
    })
    await expect(dialog).toContainText("Esta acción no se puede deshacer.")
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(scriptCard(page, script.name)).toHaveCount(0)
    const scripts = await rpc<ScriptRow[]>(page.request, "scripts/list")
    expect(scripts.some((row) => row.id === script.id)).toBe(false)
  })

  test("ejecuta un script contra un dispositivo y la consola termina", async ({
    page,
    seed,
  }) => {
    test.setTimeout(120_000)
    const credential = await seed.credential()
    const device = await seed.device({ credentialId: credential.id })
    const script = await seed.script()

    await page.goto(`/scripts/${script.id}/run`)
    await expect(
      page.getByRole("heading", { level: 1, name: script.name, exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(
        "Configura el inventario y pulsa Ejecutar para ver la salida aquí."
      )
    ).toBeVisible()

    const search = page.getByPlaceholder("Buscar…", { exact: true })
    await waitForHydration(search)
    const run = page.getByRole("button", { name: /^Ejecutar/ })
    await expect(run).toBeDisabled()

    await search.fill(device.name)
    const row = page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(device.name)}`),
    })
    await row.click()
    await expect(row).toHaveAttribute("aria-pressed", "true")
    await expect(run).toBeEnabled()
    await expect(run).toContainText("1")

    await run.click()
    const confirm = page.getByRole("dialog", {
      name: `¿Ejecutar "${script.name}"?`,
    })
    await expect(confirm).toContainText(device.name)
    await confirm.getByRole("button", { name: "Iniciar ejecución" }).click()

    // Any terminal outcome counts (the runner may be up or down): the
    // "new run" action only becomes enabled once the stream has ended.
    await expect(
      page.getByRole("button", { name: "Nueva ejecución" })
    ).toBeEnabled({ timeout: 90_000 })
    await expect(
      page.getByText("Salida en tiempo real conectada.")
    ).toHaveCount(0)
    await expect(run).toBeEnabled()
  })
})
