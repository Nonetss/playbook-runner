import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

type Named = { id: string; name: string }

const PLAYBOOK_CONTENT = "- hosts: all\n  gather_facts: false\n  tasks: []\n"

/** A run (finished or failed) or a stream error: never asserts which. */
const RUN_OUTCOME =
  /Ejecución finalizada — estado|La conexión de la ejecución terminó/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function sidebar(page: Page) {
  return page.locator("[data-sidebar=sidebar]")
}

/** Opens `/playbooks` and narrows the browser to `term`. */
async function openPlaybooks(page: Page, term: string) {
  await page.goto("/playbooks")
  const search = page.getByRole("searchbox", {
    name: "Buscar carpetas o playbooks",
  })
  await waitForHydration(search)
  await search.fill(term)
  return search
}

function playbookLink(page: Page, name: string) {
  return page.getByRole("link", { name, exact: true })
}

function folderSection(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true })
}

async function findByName(page: Page, path: string, name: string) {
  const records = await rpc<Named[]>(page.request, path)
  const record = records.find((item) => item.name === name)
  if (!record) throw new Error(`${path} has no record named ${name}`)
  return record
}

test.describe("Sección Ansible", () => {
  test("la vista general enlaza playbooks, scheduler e historial", async ({
    page,
  }) => {
    await page.goto("/ansible")
    await expect(
      page.getByRole("heading", { level: 1, name: "Ansible", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(
        "Playbooks, jobs programados y su historial de ejecuciones."
      )
    ).toBeVisible()

    for (const [label, href] of [
      ["Playbooks", "/playbooks"],
      ["Scheduler", "/jobs/scheduler"],
      ["Historial", "/jobs/history"],
    ] as const) {
      const tile = page.getByRole("link").filter({
        has: page.getByRole("heading", { level: 2, name: label, exact: true }),
      })
      await expect(tile).toHaveAttribute("href", href)
    }

    const playbooksEntry = sidebar(page).getByRole("link", {
      name: "Playbooks",
      exact: true,
    })
    await waitForHydration(playbooksEntry)
    await expect(playbooksEntry).toBeVisible()
  })
})

test.describe("Playbooks: listado", () => {
  test("renderiza el hero y la barra lateral de la sección", async ({
    page,
  }) => {
    await page.goto("/playbooks")
    await expect(
      page.getByRole("heading", { level: 1, name: "Playbooks", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Edita y ejecuta automatizaciones Ansible.")
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Nuevo playbook", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Nueva carpeta", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Añadir repositorio", exact: true })
    ).toBeVisible()

    const entry = sidebar(page).getByRole("link", {
      name: "Playbooks",
      exact: true,
    })
    await waitForHydration(entry)
    await expect(entry).toHaveAttribute("data-active", "true")
  })

  test("muestra un playbook sembrado en la raíz", async ({ page, seed }) => {
    const playbook = await seed.playbook({ description: "e2e raíz" })
    await openPlaybooks(page, playbook.name)

    const link = playbookLink(page, playbook.name)
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", `/playbooks/${playbook.id}/edit`)
    await expect(
      page.getByRole("button", {
        name: `Acciones para ${playbook.name}`,
        exact: true,
      })
    ).toBeVisible()
  })

  test("lista un playbook dentro de su carpeta", async ({ page, seed }) => {
    const folder = await seed.folder()
    const playbook = await seed.playbook({ folderId: folder.id })
    await openPlaybooks(page, playbook.name)

    const section = folderSection(page, folder.name)
    await expect(section).toBeVisible()
    await expect(section).toContainText("1 playbook")
    await expect(
      section.getByRole("link", { name: playbook.name, exact: true })
    ).toBeVisible()

    // The folder's own view lists it too.
    await section
      .getByRole("link", { name: `Abrir ${folder.name}`, exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`[?&]folder=${folder.id}`))
    await expect(
      page.getByRole("heading", { level: 1, name: folder.name, exact: true })
    ).toBeVisible()
    await expect(playbookLink(page, playbook.name)).toBeVisible()
  })

  test("crea una carpeta desde el diálogo", async ({ page, seed }) => {
    const name = seed.name("ui-folder")
    await page.goto("/playbooks")
    const trigger = page.getByRole("button", {
      name: "Nueva carpeta",
      exact: true,
    })
    await waitForHydration(trigger)
    await trigger.click()

    const dialog = page.getByRole("dialog", { name: "Nueva carpeta" })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel("Nombre", { exact: true }).fill(name)
    await dialog.getByLabel("Descripción", { exact: true }).fill("e2e")
    await dialog
      .getByRole("button", { name: "Nueva carpeta", exact: true })
      .click()
    await expect(dialog).toBeHidden()

    const folder = await findByName(page, "playbooks/folders/list", name)
    seed.track("playbooks/folders/delete", { id: folder.id })

    await page
      .getByRole("searchbox", { name: "Buscar carpetas o playbooks" })
      .fill(name)
    const section = folderSection(page, name)
    await expect(section).toBeVisible()
    await expect(section).toContainText("Sin playbooks en esta carpeta.")
  })

  test("mueve un playbook a una carpeta", async ({ page, seed }) => {
    const folder = await seed.folder()
    const playbook = await seed.playbook()
    await openPlaybooks(page, playbook.name)
    await expect(folderSection(page, folder.name)).toHaveCount(0)

    await page
      .getByRole("button", {
        name: `Acciones para ${playbook.name}`,
        exact: true,
      })
      .click()
    await page.getByRole("menuitem", { name: "Mover a..." }).click()

    const dialog = page.getByRole("dialog", { name: "Mover playbook" })
    await expect(dialog).toContainText(`Elige dónde guardar "${playbook.name}"`)
    await dialog.getByRole("combobox", { name: "Carpeta de destino" }).click()
    await page.getByRole("option", { name: folder.name, exact: true }).click()
    await dialog.getByRole("button", { name: "Mover", exact: true }).click()
    await expect(dialog).toBeHidden()

    const section = folderSection(page, folder.name)
    await expect(
      section.getByRole("link", { name: playbook.name, exact: true })
    ).toBeVisible()
  })

  test("elimina un playbook tras confirmar", async ({ page, seed }) => {
    const playbook = await seed.playbook()
    await openPlaybooks(page, playbook.name)
    await expect(playbookLink(page, playbook.name)).toBeVisible()

    await page
      .getByRole("button", {
        name: `Acciones para ${playbook.name}`,
        exact: true,
      })
      .click()
    await page.getByRole("menuitem", { name: "Eliminar" }).click()

    const dialog = page.getByRole("dialog", {
      name: `Eliminar "${playbook.name}"`,
    })
    await expect(dialog).toContainText("Esta acción no se puede deshacer.")
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click()

    await expect(playbookLink(page, playbook.name)).toHaveCount(0)
  })

  test("elimina una carpeta tras confirmar", async ({ page, seed }) => {
    const folder = await seed.folder()
    await openPlaybooks(page, folder.name)
    await expect(folderSection(page, folder.name)).toBeVisible()

    await page
      .getByRole("button", {
        name: `Acciones para la carpeta ${folder.name}`,
        exact: true,
      })
      .click()
    await page.getByRole("menuitem", { name: "Eliminar" }).click()

    const dialog = page.getByRole("dialog", {
      name: `Eliminar "${folder.name}"`,
    })
    await expect(dialog).toContainText(
      "La carpeta se eliminará y sus playbooks volverán a la raíz."
    )
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click()

    await expect(folderSection(page, folder.name)).toHaveCount(0)
  })
})

test.describe("Playbooks: formulario", () => {
  test("crea un playbook desde /playbooks/new", async ({ page, seed }) => {
    const name = seed.name("ui.yml")
    await page.goto("/playbooks/new")
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Nuevo playbook",
        exact: true,
      })
    ).toBeVisible()

    const nameField = page.getByLabel("Nombre", { exact: true })
    await waitForHydration(nameField)
    await expect(
      sidebar(page).getByRole("link", { name: "Playbooks", exact: true })
    ).toHaveAttribute("data-active", "true")

    const submit = page.getByRole("button", {
      name: "Crear playbook",
      exact: true,
    })
    // Without content the playbook can't be saved.
    await expect(submit).toBeDisabled()

    await nameField.fill(name)
    await page.getByLabel("Descripción", { exact: true }).fill("Creado por e2e")
    const editor = page.locator("#content-field")
    await editor.click()
    // insertText skips CodeMirror's auto-indent, so the YAML stays verbatim.
    await page.keyboard.insertText(PLAYBOOK_CONTENT)
    await expect(editor).toContainText("gather_facts: false")

    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(page).toHaveURL(/\/playbooks$/)

    const created = await findByName(page, "playbooks/list", name)
    seed.track("playbooks/delete", { id: created.id })

    const search = page.getByRole("searchbox", {
      name: "Buscar carpetas o playbooks",
    })
    await waitForHydration(search)
    await search.fill(name)
    await expect(playbookLink(page, name)).toBeVisible()
    await expect(page.getByText("Creado por e2e")).toBeVisible()
  })

  test("edita el nombre de un playbook", async ({ page, seed }) => {
    const playbook = await seed.playbook()
    const renamed = `${playbook.name}-renamed`
    await page.goto(`/playbooks/${playbook.id}/edit`)

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Editar playbook",
        exact: true,
      })
    ).toBeVisible()
    const nameField = page.getByLabel("Nombre", { exact: true })
    await waitForHydration(nameField)
    // Wait for the loaded row to seed the form before typing over it.
    await expect(nameField).toHaveValue(playbook.name)
    await expect(page.locator("#content-field")).toContainText("hosts: all")
    await expect(
      page.getByRole("link", { name: "Ejecutar playbook", exact: true })
    ).toHaveAttribute("href", `/playbooks/${playbook.id}/run`)

    await nameField.fill(renamed)
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click()
    await expect(page).toHaveURL(/\/playbooks$/)

    const search = page.getByRole("searchbox", {
      name: "Buscar carpetas o playbooks",
    })
    await waitForHydration(search)
    await search.fill(playbook.name)
    await expect(playbookLink(page, renamed)).toBeVisible()
    await expect(playbookLink(page, playbook.name)).toHaveCount(0)
  })
})

test.describe("Playbooks: ejecución", () => {
  test("ejecuta un playbook contra un dispositivo y muestra el resultado", async ({
    page,
    seed,
  }) => {
    // 90 s for the outcome plus page load and seeding.
    test.setTimeout(150_000)
    const credential = await seed.credential()
    const device = await seed.device({ credentialId: credential.id })
    const playbook = await seed.playbook()

    await page.goto(`/playbooks/${playbook.id}/run`)
    await expect(
      page.getByRole("heading", { level: 1, name: playbook.name, exact: true })
    ).toBeVisible()
    const search = page.getByPlaceholder("Buscar…", { exact: true })
    await waitForHydration(search)
    await expect(
      page.getByText(
        "Configura el inventario y pulsa Ejecutar para ver la salida aquí."
      )
    ).toBeVisible()

    await search.fill(device.name)
    const row = page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(device.name)}`),
    })
    await row.click()
    await expect(row).toHaveAttribute("aria-pressed", "true")

    const runButton = page.getByRole("button", { name: /^Ejecutar/ })
    await expect(runButton).toContainText("1")
    await runButton.click()
    const confirm = page.getByRole("dialog", {
      name: `¿Ejecutar "${playbook.name}"?`,
    })
    await expect(confirm).toContainText(device.name)
    await confirm.getByRole("button", { name: "Iniciar ejecución" }).click()

    // The console leaves the idle state as soon as the run starts.
    const newRun = page.getByRole("button", {
      name: "Nueva ejecución",
      exact: true,
    })
    await expect(newRun).toBeVisible()

    await expect(page.getByText(RUN_OUTCOME)).toBeVisible({ timeout: 90_000 })
    await expect(newRun).toBeEnabled()
  })
})
