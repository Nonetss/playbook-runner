import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

const PAGE = "/ansible/infisical"

/** The run panel starts with these blocks folded. */
async function openRunBlock(page: Page, name: "Infisical" | "Variables") {
  const block = page.getByRole("button", { name, exact: true })
  await waitForHydration(block)
  if ((await block.getAttribute("aria-expanded")) === "false") {
    await block.click()
  }
}

type ConnectionRow = { id: string; name: string }

/**
 * Seeded connections point at an unreachable host, so the two listings that go
 * through the runner to Infisical are answered here. Only names, as in the API.
 */
async function mockInfisicalListings(page: Page) {
  await page.route("**/rpc/v1/infisicalConnections/environments", (route) =>
    route.fulfill({
      json: {
        json: [
          { slug: "dev", name: "Development" },
          { slug: "prod", name: "Production" },
        ],
      },
    })
  )
  await page.route("**/rpc/v1/infisicalConnections/secretNames", (route) =>
    route.fulfill({ json: { json: ["API_KEY", "DB_PASS"] } })
  )
}

const DECLARED = [
  { name: "db_password", secretName: "DB_PASS", secretPath: "/" },
]

/** The card of one connection, by its (unique) name. */
function card(page: Page, name: string) {
  return page.getByRole("main").getByRole("listitem").filter({ hasText: name })
}

async function openActions(page: Page, name: string) {
  const actions = page.getByRole("button", {
    name: `Acciones para ${name}`,
  })
  await waitForHydration(actions)
  await actions.click()
}

test.describe("Conexiones de Infisical", () => {
  test("avisa de no_log y del acceso mínimo", async ({ page }) => {
    await page.goto(PAGE)

    await expect(
      page.getByRole("heading", { level: 1, name: "Infisical", exact: true })
    ).toBeVisible()
    await expect(page.getByText(/no_log: true/)).toBeVisible()
    await expect(page.getByText(/mínimo acceso/)).toBeVisible()
  })

  test("crea una conexión sin devolver nunca su secreto", async ({
    page,
    request,
    seed,
  }) => {
    const name = seed.name("infisical")

    await page.goto(PAGE)
    const create = page.getByRole("button", { name: "Nueva conexión" }).first()
    await waitForHydration(create)
    await create.click()

    const form = page.getByRole("dialog", { name: "Nueva conexión" })
    await form.getByLabel("Nombre").fill(name)
    await form.getByLabel("Project ID").fill("e2e-project-id")
    await form.getByLabel("Client ID").fill("e2e-client-id")
    await form.getByLabel("Client Secret").fill("e2e-created-secret")
    await form.getByRole("button", { name: "Crear conexión" }).click()

    await expect(card(page, name)).toBeVisible()

    const rows = await rpc<ConnectionRow[]>(
      request,
      "infisicalConnections/list",
      {}
    )
    const created = rows.find((row) => row.name === name)
    if (!created) throw new Error("connection not listed")
    seed.track("infisicalConnections/delete", { id: created.id })
    expect(JSON.stringify(rows)).not.toContain("e2e-created-secret")
  })

  test("edita una conexión conservando el secreto si se deja vacío", async ({
    page,
    seed,
  }) => {
    const connection = await seed.infisicalConnection()
    const renamed = seed.name("renamed")

    await page.goto(PAGE)
    await openActions(page, connection.name)
    await page.getByRole("menuitem", { name: "Editar" }).click()

    const form = page.getByRole("dialog", { name: "Editar conexión" })
    await expect(form.getByLabel("Client Secret")).toHaveValue("")
    await form.getByLabel("Nombre").fill(renamed)
    await form.getByRole("button", { name: "Guardar cambios" }).click()

    await expect(card(page, renamed)).toBeVisible()
  })

  test("borra una conexión que ningún job usa", async ({ page, seed }) => {
    const connection = await seed.infisicalConnection()

    await page.goto(PAGE)
    await openActions(page, connection.name)
    await page.getByRole("menuitem", { name: "Eliminar" }).click()
    await page
      .getByRole("dialog", { name: `Eliminar "${connection.name}"` })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click()

    await expect(card(page, connection.name)).toHaveCount(0)
  })

  test("no deja borrar una conexión que usa un job", async ({ page, seed }) => {
    const connection = await seed.infisicalConnection()
    await seed.job({ infisicalConnectionId: connection.id })

    await page.goto(PAGE)
    await openActions(page, connection.name)
    await page.getByRole("menuitem", { name: "Eliminar" }).click()
    await page
      .getByRole("dialog", { name: `Eliminar "${connection.name}"` })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click()

    await expect(
      page.getByText("No se pudo eliminar la conexión", { exact: false })
    ).toBeVisible()
    await page.reload()
    await expect(card(page, connection.name)).toBeVisible()
  })

  test("no deja borrar una conexión que declara un playbook", async ({
    page,
    request,
    seed,
  }) => {
    const connection = await seed.infisicalConnection()
    const playbook = await seed.playbook()
    await rpc(request, "playbooks/secretVariables/set", {
      id: playbook.id,
      infisicalConnectionId: connection.id,
      infisicalEnvironment: "dev",
      variables: DECLARED,
    })

    await page.goto(PAGE)
    await openActions(page, connection.name)
    await page.getByRole("menuitem", { name: "Eliminar" }).click()
    await page
      .getByRole("dialog", { name: `Eliminar "${connection.name}"` })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click()

    await expect(
      page.getByText("No se pudo eliminar la conexión", { exact: false })
    ).toBeVisible()
    await page.reload()
    await expect(card(page, connection.name)).toBeVisible()
  })

  test("el buscador abre la conexión en su formulario", async ({
    page,
    seed,
  }) => {
    const connection = await seed.infisicalConnection()

    await page.goto(`${PAGE}?edit=${connection.id}`)

    await expect(
      page.getByRole("dialog", { name: "Editar conexión" }).getByLabel("Nombre")
    ).toHaveValue(connection.name)
  })

  test("declara los secretos de un playbook eligiéndolos de la lista", async ({
    page,
    request,
    seed,
  }) => {
    await mockInfisicalListings(page)
    const connection = await seed.infisicalConnection()
    const playbook = await seed.playbook()

    await page.goto(`/playbooks/${playbook.id}/edit`)
    const panel = page.getByRole("complementary", {
      name: "Secretos de Infisical",
    })
    const select = panel.getByLabel("Conexión de Infisical")
    await waitForHydration(select)
    await expect(
      panel.getByRole("button", { name: "Guardar secretos" })
    ).toBeDisabled()
    await select.click()
    await page.getByRole("option", { name: connection.name }).click()
    await expect(panel.getByLabel("Entorno por defecto")).toContainText(
      "Development"
    )
    await panel.getByRole("button", { name: "Añadir variable" }).click()
    await panel.getByLabel("Secreto de la variable 1", { exact: true }).click()
    await page.getByPlaceholder("Buscar secreto…").fill("pass db")
    await expect(page.getByRole("option", { name: "API_KEY" })).toBeHidden()
    await page.getByRole("option", { name: "DB_PASS" }).click()

    await expect(panel.getByLabel("Nombre de la variable 1")).toHaveValue(
      "db_pass"
    )
    await panel.getByRole("button", { name: "Guardar secretos" }).click()
    await expect(page.getByText("Secretos guardados")).toBeVisible()

    const saved = await rpc(request, "playbooks/secretVariables/get", {
      id: playbook.id,
    })
    expect(saved).toEqual({
      infisicalConnectionId: connection.id,
      infisicalEnvironment: "dev",
      variables: [{ name: "db_pass", secretName: "DB_PASS", secretPath: "/" }],
    })
  })

  test("mantiene a la vista un secreto que Infisical ya no lista", async ({
    page,
    request,
    seed,
  }) => {
    await mockInfisicalListings(page)
    const connection = await seed.infisicalConnection()
    const playbook = await seed.playbook()
    await rpc(request, "playbooks/secretVariables/set", {
      id: playbook.id,
      infisicalConnectionId: connection.id,
      infisicalEnvironment: "dev",
      variables: [{ name: "old", secretName: "GONE", secretPath: "/" }],
    })

    await page.goto(`/playbooks/${playbook.id}/edit`)
    const secret = page
      .getByRole("complementary", { name: "Secretos de Infisical" })
      .getByLabel("Secreto de la variable 1", { exact: true })
    await waitForHydration(secret)

    await expect(secret).toContainText("GONE (ya no aparece)")
  })

  test("al ejecutar, las variables del playbook salen rellenas y no se quitan", async ({
    page,
    request,
    seed,
  }) => {
    await mockInfisicalListings(page)
    const connection = await seed.infisicalConnection()
    const playbook = await seed.playbook()
    await rpc(request, "playbooks/secretVariables/set", {
      id: playbook.id,
      infisicalConnectionId: connection.id,
      infisicalEnvironment: "dev",
      variables: DECLARED,
    })

    await page.goto(`/playbooks/${playbook.id}/run`)
    await openRunBlock(page, "Infisical")
    await openRunBlock(page, "Variables")
    const select = page.getByLabel("Conexión de Infisical")
    await waitForHydration(select)

    await expect(select).toContainText(connection.name)
    await expect(page.getByLabel("Entorno de Infisical")).toContainText(
      "Development"
    )
    await expect(page.getByText("db_password")).toBeVisible()
    await expect(page.getByText("del playbook", { exact: true })).toBeVisible()
    await expect(
      page.getByLabel("Secreto de la variable 1", { exact: true })
    ).toContainText("DB_PASS")
    await expect(
      page.getByRole("button", { name: "Eliminar variable" })
    ).toHaveCount(0)
  })

  test("cada bloque del panel se pliega sin perder lo que contiene", async ({
    page,
    seed,
  }) => {
    const playbook = await seed.playbook()

    await page.goto(`/playbooks/${playbook.id}/run`)
    await openRunBlock(page, "Variables")
    const add = page.getByRole("button", { name: "Añadir variable" })
    await waitForHydration(add)
    await add.click()
    await page.getByLabel("Nombre de la variable 1").fill("debug")

    const variables = page.getByRole("button", {
      name: "Variables",
      exact: true,
    })
    await variables.click()
    await expect(variables).toHaveAttribute("aria-expanded", "false")
    await expect(add).toBeHidden()
    await variables.click()
    await expect(page.getByLabel("Nombre de la variable 1")).toHaveValue(
      "debug"
    )

    const infisical = page.getByRole("button", {
      name: "Infisical",
      exact: true,
    })
    await expect(page.getByLabel("Conexión de Infisical")).toBeHidden()
    await infisical.click()
    await expect(page.getByLabel("Conexión de Infisical")).toBeVisible()
    await infisical.click()
    await expect(page.getByLabel("Conexión de Infisical")).toBeHidden()

    await page.getByRole("button", { name: "INVENTARIO", exact: true }).click()
    await expect(page.getByPlaceholder("Buscar…", { exact: true })).toBeHidden()
  })

  test("sin conexión solo se ofrecen valores escritos", async ({
    page,
    seed,
  }) => {
    await seed.infisicalConnection()
    const playbook = await seed.playbook()

    await page.goto(`/playbooks/${playbook.id}/run`)
    await openRunBlock(page, "Variables")
    const add = page.getByRole("button", { name: "Añadir variable" })
    await waitForHydration(add)
    await add.click()

    await expect(page.getByLabel("Valor de la variable 1")).toBeVisible()
    await expect(page.getByLabel("Tipo de la variable 1")).toHaveCount(0)
    await expect(page.getByLabel("Entorno de Infisical")).toHaveCount(0)
  })

  test("una conexión sin Project ID pide completarla en vez de un texto", async ({
    page,
    seed,
  }) => {
    const connection = await seed.infisicalConnection()
    const playbook = await seed.playbook()
    // Only rows from before the project id existed lack one: the API requires it.
    await page.route("**/rpc/v1/infisicalConnections/list", async (route) => {
      const response = await route.fetch()
      const body = await response.json()
      for (const row of body.json) row.projectId = null
      await route.fulfill({ response, json: body })
    })

    await page.goto(`/playbooks/${playbook.id}/run`)
    await openRunBlock(page, "Infisical")
    const select = page.getByLabel("Conexión de Infisical")
    await waitForHydration(select)
    await select.click()
    await page.getByRole("option", { name: connection.name }).click()

    await expect(page.getByLabel("Entorno de Infisical")).toBeDisabled()
    await expect(
      page.getByRole("link", { name: "Editar la conexión" })
    ).toHaveAttribute("href", `/ansible/infisical?edit=${connection.id}`)
  })

  test("si Infisical no lista entornos, el entorno se escribe a mano", async ({
    page,
    seed,
  }) => {
    await page.route("**/rpc/v1/infisicalConnections/environments", (route) =>
      route.fulfill({ json: { json: [] } })
    )
    const connection = await seed.infisicalConnection()
    const playbook = await seed.playbook()

    await page.goto(`/playbooks/${playbook.id}/run`)
    await openRunBlock(page, "Infisical")
    const select = page.getByLabel("Conexión de Infisical")
    await waitForHydration(select)
    await select.click()
    await page.getByRole("option", { name: connection.name }).click()

    await page.getByLabel("Entorno de Infisical").fill("dev")
    await expect(page.getByLabel("Entorno de Infisical")).toHaveValue("dev")
  })

  test("un job guarda un secreto como secreto y un texto como extra var", async ({
    page,
    request,
    seed,
  }) => {
    await mockInfisicalListings(page)
    const connection = await seed.infisicalConnection()
    const job = await seed.job()

    await page.goto(`/jobs/${job.id}/edit`)
    const select = page.getByLabel("Conexión de Infisical")
    await waitForHydration(select)
    await select.click()
    await page.getByRole("option", { name: connection.name }).click()
    await expect(page.getByLabel("Entorno de Infisical")).toContainText(
      "Development"
    )

    const add = page.getByRole("button", { name: "Añadir variable" })
    await add.click()
    await page.getByLabel("Tipo de la variable 1").click()
    await page.getByRole("option", { name: "Secreto" }).click()
    await page.getByLabel("Secreto de la variable 1", { exact: true }).click()
    await page.getByRole("option", { name: "API_KEY" }).click()
    await expect(page.getByLabel("Nombre de la variable 1")).toHaveValue(
      "api_key"
    )

    await add.click()
    await page.getByLabel("Nombre de la variable 2").fill("debug")
    await page.getByLabel("Valor de la variable 2").fill("true")
    await page.getByRole("button", { name: "Guardar cambios" }).click()
    await page.waitForURL("**/jobs/scheduler")

    const saved = await rpc<{
      infisicalEnvironment: string | null
      extravarsJson: Record<string, string>
      secretVariables: unknown[]
    }>(request, "jobs/get", { id: job.id })
    expect(saved.infisicalEnvironment).toBe("dev")
    expect(saved.extravarsJson).toEqual({ debug: "true" })
    expect(saved.secretVariables).toEqual([
      { name: "api_key", secretName: "API_KEY", secretPath: "/" },
    ])
  })

  test("un playbook se ejecuta con una conexión elegida", async ({
    page,
    seed,
  }) => {
    const connection = await seed.infisicalConnection()
    const credential = await seed.credential()
    const device = await seed.device({ credentialId: credential.id })
    const playbook = await seed.playbook()

    await page.goto(`/playbooks/${playbook.id}/run`)
    const select = page.getByLabel("Conexión de Infisical")
    await waitForHydration(select)
    await select.click()
    await page.getByRole("option", { name: connection.name }).click()
    await expect(select).toContainText(connection.name)

    await page.getByPlaceholder("Buscar…", { exact: true }).fill(device.name)
    await page
      .getByRole("button", { name: new RegExp(`^${device.name}`) })
      .click()
    await page.getByRole("button", { name: /^Ejecutar/ }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Iniciar ejecución" })
      .click()

    // Any terminal outcome counts: the "new run" action ends the stream.
    await expect(
      page.getByRole("button", { name: "Nueva ejecución" })
    ).toBeEnabled({ timeout: 90_000 })
  })

  test("un job guarda su conexión y se puede volver a dejar sin ella", async ({
    page,
    request,
    seed,
  }) => {
    const connection = await seed.infisicalConnection()
    const job = await seed.job()

    async function choose(option: string) {
      await page.goto(`/jobs/${job.id}/edit`)
      const select = page.getByLabel("Conexión de Infisical")
      await waitForHydration(select)
      await select.click()
      await page.getByRole("option", { name: option }).click()
      await page.getByRole("button", { name: "Guardar cambios" }).click()
      await page.waitForURL("**/jobs/scheduler")
    }

    await choose(connection.name)
    const saved = await rpc<{ infisicalConnectionId: string | null }>(
      request,
      "jobs/get",
      { id: job.id }
    )
    expect(saved.infisicalConnectionId).toBe(connection.id)

    await choose("Sin conexión")
    const cleared = await rpc<{ infisicalConnectionId: string | null }>(
      request,
      "jobs/get",
      { id: job.id }
    )
    expect(cleared.infisicalConnectionId).toBeNull()
  })
})
