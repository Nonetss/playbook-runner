import type { Page } from "@playwright/test"
import { expect, test } from "@test/e2e/fixtures"
import { waitForHydration } from "@test/e2e/helpers/hydration"
import { rpc } from "@test/e2e/helpers/rpc"

/** Stat tiles: a link whose label-role caption is exactly `title`. */
function statTile(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("link")
    .filter({ has: page.locator("p", { hasText: new RegExp(`^${title}$`) }) })
}

/** The dashboard lists only the first eight jobs (oldest first). */
const DASHBOARD_JOB_LIMIT = 8

const STAT_DESTINATIONS = [
  { title: "Jobs", href: "/jobs/scheduler", heading: "Scheduler" },
  { title: "Playbooks", href: "/playbooks", heading: "Playbooks" },
  {
    title: "Dispositivos",
    href: "/inventory/devices",
    heading: "Dispositivos",
  },
  {
    title: "Credenciales",
    href: "/inventory/credentials",
    heading: "Credenciales",
  },
]

test.describe("Dashboard", () => {
  test("las stats cargan cifras y las métricas enlazan al historial", async ({
    page,
  }) => {
    await page.goto("/")

    for (const { title } of STAT_DESTINATIONS) {
      // "—" while loading, then a number.
      await expect(statTile(page, title)).toContainText(/\d/)
    }
    await expect(statTile(page, "Dispositivos")).toContainText(/grupos?/)

    await expect(
      page.getByRole("heading", { level: 2, name: "Métricas de ejecuciones" })
    ).toBeVisible()
    for (const title of ["Tasa de éxito", "Ejecuciones en ventana", "Fallos"]) {
      await expect(statTile(page, title)).toHaveAttribute(
        "href",
        "/jobs/history"
      )
    }

    const window7d = page.getByRole("radio", { name: "Últimos 7 días" })
    await waitForHydration(window7d)
    await expect(
      page.getByRole("radio", { name: "Últimas 24h" })
    ).toHaveAttribute("aria-checked", "true")
    await window7d.click()
    await expect(window7d).toHaveAttribute("aria-checked", "true")
  })

  for (const { title, href, heading } of STAT_DESTINATIONS) {
    test(`la stat ${title} lleva a ${href}`, async ({ page }) => {
      await page.goto("/")
      const tile = statTile(page, title)
      await waitForHydration(tile)
      await expect(tile).toHaveAttribute("href", href)
      await tile.click()

      await expect(page).toHaveURL(new RegExp(`${href}$`))
      await expect(
        page.getByRole("heading", { level: 1, name: heading, exact: true })
      ).toBeVisible()
    })
  }

  test("las secciones enlazan al scheduler, al historial y a los accesos directos", async ({
    page,
  }) => {
    await page.goto("/")
    const main = page.getByRole("main")

    await expect(
      main.getByRole("heading", { level: 2, name: "Actividad reciente" })
    ).toBeVisible()
    await expect(
      main.getByRole("link", { name: "Ver historial" })
    ).toHaveAttribute("href", "/jobs/history")
    await expect(main.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/jobs/scheduler"
    )

    await expect(
      main.getByRole("heading", { level: 2, name: "Accesos directos" })
    ).toBeVisible()
    for (const [label, href] of [
      ["Playbooks", "/playbooks"],
      ["Dispositivos", "/inventory/devices"],
      ["Credenciales", "/inventory/credentials"],
    ] as const) {
      await expect(
        main
          .getByRole("link")
          .filter({ has: page.getByRole("heading", { name: label }) })
      ).toHaveAttribute("href", href)
    }

    const viewAll = main.getByRole("link", { name: "Ver todos" })
    await waitForHydration(viewAll)
    await viewAll.click()
    await expect(page).toHaveURL(/\/jobs\/scheduler$/)
  })

  test("un job sembrado aparece en la lista de jobs con su playbook", async ({
    page,
    seed,
  }) => {
    const playbook = await seed.playbook()
    const job = await seed.job({ playbookId: playbook.id })

    const jobs = await rpc<{ id: string }[]>(page.request, "jobs/list")
    const position = jobs.findIndex((row) => row.id === job.id)
    test.skip(
      position < 0 || position >= DASHBOARD_JOB_LIMIT,
      `the dashboard lists the first ${DASHBOARD_JOB_LIMIT} jobs only`
    )

    await page.goto("/")
    const row = page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: job.name, exact: true }) })
    await expect(row).toBeVisible()
    await expect(row).toContainText(playbook.name)
    await expect(row).toContainText("Inactivo")
    await expect(row).toContainText("0 0 1 1 *")

    const link = row.getByRole("link", { name: job.name, exact: true })
    await waitForHydration(link)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/jobs/${job.id}$`))
  })
})
