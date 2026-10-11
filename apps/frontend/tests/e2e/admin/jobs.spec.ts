import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"
import type { Seeder } from "@test/e2e/helpers/seed"

type Named = { id: string; name: string }

/** A stored run that is no longer pending or running: never asserts which. */
const RUN_SETTLED = /Correcto|Parcial|Fallido/

const SCHEDULE = "0 0 1 1 *"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function sidebar(page: Page) {
  return page.locator("[data-sidebar=sidebar]")
}

/** The scheduler card of the job named `name`. */
function jobCard(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name, exact: true }) })
}

/** A playbook and a device (with a credential) a job can run against. */
async function seedRunnable(seed: Seeder) {
  const credential = await seed.credential()
  const device = await seed.device({ credentialId: credential.id })
  const playbook = await seed.playbook()
  return { device, playbook }
}

async function seedJob(seed: Seeder, overrides: Record<string, unknown> = {}) {
  const { device, playbook } = await seedRunnable(seed)
  const job = await seed.job({
    playbookId: playbook.id,
    inventoryJson: [{ type: "device", id: device.id }],
    ...overrides,
  })
  return { job, device, playbook }
}

test.describe("Jobs: scheduler", () => {
  test("renderiza el hero y la barra lateral de la sección", async ({
    page,
  }) => {
    await page.goto("/jobs/scheduler")
    await expect(
      page.getByRole("heading", { level: 1, name: "Scheduler", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Crea y gestiona automatizaciones recurrentes.")
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Nuevo job", exact: true }).first()
    ).toHaveAttribute("href", "/jobs/new")

    const entry = sidebar(page).getByRole("link", {
      name: "Scheduler",
      exact: true,
    })
    await waitForHydration(entry)
    await expect(entry).toHaveAttribute("data-active", "true")
  })

  test("lista un job sembrado con su programación y estado", async ({
    page,
    seed,
  }) => {
    const { job, playbook } = await seedJob(seed)
    await page.goto("/jobs/scheduler")

    const card = jobCard(page, job.name)
    await expect(card).toBeVisible()
    await expect(
      card.getByRole("link", { name: job.name, exact: true })
    ).toHaveAttribute("href", `/jobs/${job.id}`)
    await expect(card).toContainText(SCHEDULE)
    await expect(card).toContainText(playbook.name)
    await expect(card).toContainText("Pausado")
    await expect(card).toContainText("Sin ejecuciones")
    await expect(card.getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "false"
    )
  })

  test("activa y pausa un job desde su tarjeta", async ({ page, seed }) => {
    const { job } = await seedJob(seed)
    await page.goto("/jobs/scheduler")

    const card = jobCard(page, job.name)
    const toggle = card.getByRole("switch", { name: "Activar job" })
    await waitForHydration(toggle)
    await expect(card).toContainText("Pausado")

    await toggle.click()
    const enabled = card.getByRole("switch", { name: "Desactivar job" })
    await expect(enabled).toHaveAttribute("aria-checked", "true")
    await expect(card).toContainText("Activo")

    await enabled.click()
    await expect(
      card.getByRole("switch", { name: "Activar job" })
    ).toHaveAttribute("aria-checked", "false")
    await expect(card).toContainText("Pausado")
  })

  test("elimina un job tras confirmar", async ({ page, seed }) => {
    const { job } = await seedJob(seed)
    await page.goto("/jobs/scheduler")

    const actions = page.getByRole("button", {
      name: `Acciones para ${job.name}`,
      exact: true,
    })
    await waitForHydration(actions)
    await actions.click()
    await page.getByRole("menuitem", { name: "Eliminar" }).click()

    const dialog = page.getByRole("dialog", { name: `Eliminar "${job.name}"` })
    await expect(dialog).toContainText(
      "Esta acción eliminará el job y su historial de ejecuciones."
    )
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(jobCard(page, job.name)).toHaveCount(0)
  })
})

test.describe("Jobs: formulario", () => {
  test("crea un job desde /jobs/new", async ({ page, seed }) => {
    const { device, playbook } = await seedRunnable(seed)
    const name = seed.name("ui-job")
    await page.goto("/jobs/new")

    await expect(
      page.getByRole("heading", { level: 1, name: "Nuevo job", exact: true })
    ).toBeVisible()
    const nameField = page.getByLabel("Nombre", { exact: true })
    await waitForHydration(nameField)
    await nameField.fill(name)
    await page.getByLabel("Descripción", { exact: true }).fill("Creado por e2e")
    await expect(page.getByText("Job activo", { exact: true })).toBeVisible()

    const picker = page.getByLabel("Playbook a ejecutar")
    await expect(picker).toContainText("Sin playbook seleccionado")
    await picker.click()
    await page
      .getByRole("searchbox", { name: "Buscar playbooks" })
      .fill(playbook.name)
    await page
      .getByRole("menuitem", {
        name: new RegExp(`^${escapeRegExp(playbook.name)}`),
      })
      .click()
    await expect(picker).toContainText(playbook.name)

    await page.getByPlaceholder("Buscar…", { exact: true }).fill(device.name)
    const row = page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(device.name)}`),
    })
    await row.click()
    await expect(row).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText("1 elemento seleccionado")).toBeVisible()

    await page.getByPlaceholder("0 2 * * *").fill(SCHEDULE)
    await page.getByRole("button", { name: "Crear job", exact: true }).click()
    await expect(page).toHaveURL(/\/jobs\/scheduler$/)

    const created = await rpc<Named[]>(page.request, "jobs/list").then((jobs) =>
      jobs.find((job) => job.name === name)
    )
    expect(created, `jobs/list has no job named ${name}`).toBeDefined()
    if (created) seed.track("jobs/delete", { id: created.id })

    const card = jobCard(page, name)
    await expect(card).toBeVisible()
    await expect(card).toContainText(SCHEDULE)
    await expect(card).toContainText(playbook.name)
    await expect(card).toContainText("Activo")
  })

  test("edita el nombre de un job", async ({ page, seed }) => {
    const { job } = await seedJob(seed)
    const renamed = `${job.name}-renamed`
    await page.goto(`/jobs/${job.id}/edit`)

    await expect(
      page.getByRole("heading", { level: 1, name: "Editar job", exact: true })
    ).toBeVisible()
    const nameField = page.getByLabel("Nombre", { exact: true })
    await waitForHydration(nameField)
    await expect(nameField).toHaveValue(job.name)
    await expect(page.getByPlaceholder("0 2 * * *")).toHaveValue(SCHEDULE)

    await nameField.fill(renamed)
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click()
    await expect(page).toHaveURL(/\/jobs\/scheduler$/)

    await expect(jobCard(page, renamed)).toBeVisible()
    await expect(
      page.getByRole("link", { name: job.name, exact: true })
    ).toHaveCount(0)
  })
})

test.describe("Jobs: detalle e historial", () => {
  test("el detalle muestra la programación y un historial vacío", async ({
    page,
    seed,
  }) => {
    const { job } = await seedJob(seed)
    await page.goto(`/jobs/${job.id}`)

    await expect(
      page.getByRole("heading", { level: 1, name: job.name, exact: true })
    ).toBeVisible()
    await expect(page.getByText(SCHEDULE, { exact: true })).toBeVisible()
    await expect(page.getByText("Desactivado", { exact: true })).toBeVisible()
    await expect(page.getByText("Aún no hay ejecuciones. Pulsa")).toBeVisible()
    await expect(page.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      `/jobs/${job.id}/edit`
    )
  })

  test("ejecutar ahora termina y aparece en el historial", async ({
    page,
    seed,
  }) => {
    // 90 s for the outcome plus page loads and seeding.
    test.setTimeout(150_000)
    const { job } = await seedJob(seed)
    await page.goto(`/jobs/${job.id}`)

    const runNow = page.getByRole("button", {
      name: "Ejecutar ahora",
      exact: true,
    })
    await waitForHydration(runNow)
    await runNow.click()
    const confirm = page.getByRole("dialog", {
      name: `¿Ejecutar "${job.name}" ahora?`,
    })
    await confirm.getByRole("button", { name: "Iniciar job" }).click()

    await expect(page).toHaveURL(/[?&]run=/)
    // The run's history row: status, trigger and start time.
    const runRow = page.getByRole("button", { name: /Manual/ })
    await expect(runRow).toBeVisible()
    await expect(runRow).toContainText(RUN_SETTLED, { timeout: 90_000 })
    await expect(runNow).toBeEnabled()

    await page.goto("/jobs/history")
    await expect(
      page.getByRole("heading", { level: 1, name: "Historial", exact: true })
    ).toBeVisible()
    await expect(
      sidebar(page).getByRole("link", { name: "Historial", exact: true })
    ).toHaveAttribute("data-active", "true")
    const historyRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: job.name, exact: true }) })
    await expect(historyRow).toHaveCount(1)
    await expect(historyRow).toContainText(RUN_SETTLED)
    await expect(
      historyRow.getByRole("link", { name: job.name, exact: true })
    ).toHaveAttribute("href", new RegExp(`^/jobs/${job.id}\\?run=`))
  })
})

test.describe("Jobs: historial", () => {
  test("renderiza el hero y las métricas", async ({ page }) => {
    await page.goto("/jobs/history")
    await expect(
      page.getByRole("heading", { level: 1, name: "Historial", exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Revisa ejecuciones y resultados anteriores.")
    ).toBeVisible()
    await expect(page.getByText("Métricas de ejecución")).toBeVisible()
  })
})
