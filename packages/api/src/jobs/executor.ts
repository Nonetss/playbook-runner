import { db } from "@playbook-runner/db"
import { jobRuns, jobs } from "@playbook-runner/db/schema/jobs"
import { env } from "@playbook-runner/env/server"
import { logger } from "@playbook-runner/logger"
import { eq } from "drizzle-orm"
import { type RunInventorySelection, runHandler } from "#handlers/run"

/** A single SSE event parsed from the ansible stream. */
type RunEvent = Record<string, unknown> & { event?: string }

type RunOutcome = {
  events: RunEvent[]
  ok: boolean
  error: string | null
}

const INTERNAL_RUN_PATH = "/ansible/api/v0/run/internal"

/** The per-host recap Ansible emits once at the end of a play. */
type RunStats = {
  ok?: Record<string, number>
  changed?: Record<string, number>
  failures?: Record<string, number>
  dark?: Record<string, number>
  skipped?: Record<string, number>
}

/**
 * Count how many hosts finished clean vs. how many failed or were unreachable,
 * reading the `playbook_on_stats` recap out of the captured events. Returns
 * nulls when no recap was captured (run aborted before Ansible reported), so
 * callers can distinguish "unknown" from "zero hosts".
 *
 * A host counts as failed when it has any `failures` or `dark` (unreachable)
 * entries; every other host mentioned in the recap counts as ok. This is what
 * makes a run where 1 of 5 hosts failed render as *partial* rather than a flat
 * red "failed" in the UI.
 */
function countHostOutcomes(events: RunEvent[]): {
  hostsOk: number | null
  hostsFailed: number | null
} {
  const recap = events.findLast((e) => e.event === "playbook_on_stats") as
    | { stats?: RunStats | null }
    | undefined
  const stats = recap?.stats
  if (!stats) return { hostsOk: null, hostsFailed: null }

  const hosts = new Set<string>()
  for (const bucket of [
    stats.ok,
    stats.changed,
    stats.failures,
    stats.dark,
    stats.skipped,
  ]) {
    for (const host of Object.keys(bucket ?? {})) hosts.add(host)
  }

  let hostsOk = 0
  let hostsFailed = 0
  for (const host of hosts) {
    const failed = (stats.failures?.[host] ?? 0) + (stats.dark?.[host] ?? 0)
    if (failed > 0) hostsFailed++
    else hostsOk++
  }
  return { hostsOk, hostsFailed }
}

/**
 * Consume a `text/event-stream` body, splitting on `\n\n` frames and pulling
 * out the `event:` name and JSON `data:` payload of each. Mirrors the parser
 * the frontend uses so both ends agree on the wire format.
 */
async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onFrame: (eventName: string | undefined, data: unknown) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  const handle = (frame: string) => {
    let eventName: string | undefined
    const dataLines: string[] = []
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim()
      else if (line.startsWith("data:"))
        dataLines.push(line.slice(5).trimStart())
    }
    if (dataLines.length === 0) return
    try {
      onFrame(eventName, JSON.parse(dataLines.join("\n")))
    } catch {
      // ignore malformed frame
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep = buffer.indexOf("\n\n")
    while (sep !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      if (frame.trim()) handle(frame)
      sep = buffer.indexOf("\n\n")
    }
  }
  if (buffer.trim()) handle(buffer)
}

/**
 * Resolve a job's playbook + inventory and stream it through the ansible
 * service's internal endpoint, accumulating every event. Returns the captured
 * output and whether the run succeeded.
 */
async function streamRun(job: typeof jobs.$inferSelect): Promise<RunOutcome> {
  if (!job.playbookId) {
    return { events: [], ok: false, error: "El job no tiene playbook asignado" }
  }

  const inventory = (job.inventoryJson ?? []) as RunInventorySelection[]
  if (inventory.length === 0) {
    return {
      events: [],
      ok: false,
      error: "El job no tiene inventario seleccionado",
    }
  }

  let bundle: Awaited<ReturnType<typeof runHandler.resolveRun>>
  try {
    bundle = await runHandler.resolveRun(job.playbookId, inventory)
  } catch (err) {
    return {
      events: [],
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo resolver el run",
    }
  }

  const res = await fetch(`${env.ANSIBLE_URL}${INTERNAL_RUN_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-internal-token": env.INTERNAL_TOKEN,
    },
    body: JSON.stringify({
      bundle,
      forks: job.forks,
      extravars: job.extravarsJson ?? {},
    }),
  })

  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`
    try {
      const payload = (await res.json()) as { detail?: string }
      if (payload?.detail) detail = payload.detail
    } catch {
      // keep status fallback
    }
    return { events: [], ok: false, error: detail }
  }

  const events: RunEvent[] = []
  let ok = false
  let error: string | null = null

  await consumeSse(res.body, (eventName, data) => {
    if (eventName === "done") {
      ok = Boolean((data as { ok?: boolean })?.ok)
    } else if (eventName === "error") {
      error = (data as { error?: string })?.error ?? "Error en la ejecución"
    } else {
      events.push(data as RunEvent)
    }
  })

  return { events, ok: error ? false : ok, error }
}

/** Stream the playbook for an already-recorded run and persist the result. */
async function completeRun(
  job: typeof jobs.$inferSelect,
  runId: string
): Promise<void> {
  let outcome: RunOutcome
  try {
    outcome = await streamRun(job)
  } catch (err) {
    outcome = {
      events: [],
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    }
  }

  const { hostsOk, hostsFailed } = countHostOutcomes(outcome.events)

  await db
    .update(jobRuns)
    .set({
      status: outcome.ok ? "ok" : "failed",
      eventsJson: outcome.events,
      error: outcome.error,
      hostsOk,
      hostsFailed,
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.id, runId))
}

/** Load the job and open a `running` run row. Returns null if the job is gone. */
async function openRun(
  jobId: string,
  trigger: "manual" | "schedule"
): Promise<{ job: typeof jobs.$inferSelect; runId: string } | null> {
  const job = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .then((rows) => rows[0] ?? null)

  if (!job) return null

  const run = await db
    .insert(jobRuns)
    .values({
      jobId: job.id,
      status: "running",
      trigger,
      startedAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0] ?? null)

  if (!run) return null
  return { job, runId: run.id }
}

/**
 * Execute a job end-to-end and wait for it to finish: record a `running` run,
 * stream the playbook, then persist the captured events + terminal status.
 * Used by the scheduler. Never throws — failures are stored on the run row.
 */
export async function executeJob(
  jobId: string,
  trigger: "manual" | "schedule" = "manual"
): Promise<string | null> {
  const opened = await openRun(jobId, trigger)
  if (!opened) return null
  await completeRun(opened.job, opened.runId)
  return opened.runId
}

/**
 * Start a job execution without waiting for the playbook to finish: records the
 * run, kicks off streaming in the background, and returns the run id right away
 * so callers (e.g. the "run now" RPC) can respond immediately and let the UI
 * poll for progress.
 */
export async function startJobRun(
  jobId: string,
  trigger: "manual" | "schedule" = "manual"
): Promise<string | null> {
  const opened = await openRun(jobId, trigger)
  if (!opened) return null
  void completeRun(opened.job, opened.runId).catch((err) => {
    logger.error({ runId: opened.runId, err }, "run failed")
  })
  return opened.runId
}
