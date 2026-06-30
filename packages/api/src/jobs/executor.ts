import { db } from "@none.stack/db"
import { jobRuns, jobs } from "@none.stack/db/schema/jobs"
import { env } from "@none.stack/env/server"
import { eq } from "drizzle-orm"
import { type RunInventorySelection, runHandler } from "@/handlers/run"

/** A single SSE event parsed from the ansible stream. */
type RunEvent = Record<string, unknown> & { event?: string }

type RunOutcome = {
  events: RunEvent[]
  ok: boolean
  error: string | null
}

const INTERNAL_RUN_PATH = "/ansible/api/v0/run/internal"

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
    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      if (frame.trim()) handle(frame)
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

  await db
    .update(jobRuns)
    .set({
      status: outcome.ok ? "ok" : "failed",
      eventsJson: outcome.events,
      error: outcome.error,
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
    console.error(`[executor] run ${opened.runId} failed:`, err)
  })
  return opened.runId
}
