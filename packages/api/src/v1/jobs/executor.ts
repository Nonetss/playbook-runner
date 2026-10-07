import { db } from "@playbook-runner/db"
import { jobRuns, jobs } from "@playbook-runner/db/schema/jobs"
import { env } from "@playbook-runner/env/server"
import { getClient, serverStream } from "@playbook-runner/grpc"
import { RunnerServiceClient } from "@playbook-runner/grpc/stubs"
import { logger } from "@playbook-runner/logger"
import { and, eq, sql } from "drizzle-orm"
import { beginLiveRun, finishLiveRun, publishRunEvent } from "#v1/jobs/live"
import {
  describeStreamError,
  RUN_TIMEOUT_MS,
  type RunEventRecord,
  taskEventToRecord,
  toProtoHost,
} from "#v1/run/proto"
import { resolveRun } from "#v1/run/resolve"
import type { RunInventorySelection } from "#v1/run/selection"

type RunOutcome = {
  events: RunEventRecord[]
  ok: boolean
  error: string | null
  /** Commit a Git-sourced playbook ran at. */
  commitSha?: string
}

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
function countHostOutcomes(events: RunEventRecord[]): {
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
 * Resolve a job's playbook + inventory and stream it through the ansible
 * service's `RunnerService.RunBundle` (gRPC), publishing each event to the
 * live registry (`#v1/jobs/live`) as it arrives — regardless of whether
 * anyone is currently watching — and returning the fully accumulated output
 * once the run finishes, for persistence.
 */
async function streamRun(
  job: typeof jobs.$inferSelect,
  runId: string
): Promise<RunOutcome> {
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

  let bundle: Awaited<ReturnType<typeof resolveRun>>
  try {
    bundle = await resolveRun(job.playbookId, inventory)
  } catch (err) {
    return {
      events: [],
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo resolver el run",
    }
  }

  if (!env.SERVICE_TOKEN) {
    return {
      events: [],
      ok: false,
      error: "gRPC is not configured (SERVICE_TOKEN is missing)",
    }
  }

  const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
  const events: RunEventRecord[] = []
  let ok = false
  let error: string | null = null

  try {
    const stream = serverStream(
      client.runBundle.bind(client),
      {
        playbook: bundle.playbook,
        hosts: bundle.hosts.map(toProtoHost),
        forks: job.forks,
        extravars: (job.extravarsJson ?? {}) as Record<string, string>,
      },
      { token: env.SERVICE_TOKEN, timeoutMs: RUN_TIMEOUT_MS }
    )
    for await (const frame of stream) {
      // Transport-only keepalive: never stored nor published.
      if (frame.heartbeat) continue
      if (frame.done) {
        ok = frame.done.ok
      } else if (frame.error !== undefined) {
        error = frame.error
      } else if (frame.task) {
        const record = taskEventToRecord(frame.task)
        events.push(record)
        publishRunEvent(runId, record)
      }
    }
  } catch (err) {
    return {
      events,
      ok: false,
      error: describeStreamError(err),
      commitSha: bundle.commitSha,
    }
  }

  return {
    events,
    ok: error ? false : ok,
    error,
    commitSha: bundle.commitSha,
  }
}

/**
 * Stream the playbook for an already-recorded run, publishing events to the
 * live registry as they happen (so any caller — the scheduler, a "run now"
 * click, or someone attaching later via `jobs.runs.watch` — sees the same
 * run), and persist the result once it finishes.
 */
async function completeRun(
  job: typeof jobs.$inferSelect,
  runId: string
): Promise<void> {
  beginLiveRun(runId)

  let outcome: RunOutcome
  try {
    outcome = await streamRun(job, runId)
  } catch (err) {
    outcome = {
      events: [],
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    }
  }

  const { hostsOk, hostsFailed } = countHostOutcomes(outcome.events)
  let status: "ok" | "failed" = outcome.ok ? "ok" : "failed"

  try {
    await db
      .update(jobRuns)
      .set({
        status,
        eventsJson: outcome.events,
        error: outcome.error,
        hostsOk,
        hostsFailed,
        commitSha: outcome.commitSha ?? null,
        finishedAt: new Date(),
      })
      .where(eq(jobRuns.id, runId))
  } catch (err) {
    // Never leave the row `running` (it also acts as the job's run lock):
    // retry with the smallest possible update. `recoverOrphanedRuns` at the
    // next boot is the last resort.
    logger.error({ runId, err }, "failed to persist run result")
    status = "failed"
    await db
      .update(jobRuns)
      .set({
        status,
        error: outcome.error ?? "Could not persist the run result",
        finishedAt: new Date(),
      })
      .where(eq(jobRuns.id, runId))
      .catch((retryErr) =>
        logger.error({ runId, err: retryErr }, "failed to mark run as failed")
      )
  } finally {
    // Always release live watchers, even when persisting failed.
    finishLiveRun(runId, { runId, status, ok: status === "ok" })
  }
}

type OpenRunResult =
  | { status: "opened"; job: typeof jobs.$inferSelect; runId: string }
  | { status: "not_found" }
  | { status: "conflict" }

/**
 * Load the job and open a `running` run row, unless the job already has one.
 *
 * The check-then-insert runs under a transaction-scoped advisory lock keyed by
 * the job id, so a manual run and a scheduled run of the same job can't both
 * pass the check. Once committed, the `running` row itself is the lock until
 * `completeRun` (or `recoverOrphanedRuns`) finishes it.
 */
async function openRun(
  jobId: string,
  trigger: "manual" | "schedule"
): Promise<OpenRunResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${jobId}))`)

    const job = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .then((rows) => rows[0] ?? null)
    if (!job) return { status: "not_found" as const }

    const running = await tx
      .select({ id: jobRuns.id })
      .from(jobRuns)
      .where(and(eq(jobRuns.jobId, jobId), eq(jobRuns.status, "running")))
      .limit(1)
    if (running.length > 0) return { status: "conflict" as const }

    const run = await tx
      .insert(jobRuns)
      .values({
        jobId: job.id,
        status: "running",
        trigger,
        startedAt: new Date(),
      })
      .returning({ id: jobRuns.id })
      .then((rows) => rows[0])
    if (!run) throw new Error("Could not create the job run")
    return { status: "opened" as const, job, runId: run.id }
  })
}

/**
 * Execute a job end-to-end and wait for it to finish: record a `running` run,
 * stream the playbook, then persist the captured events + terminal status.
 * Used by the scheduler. Never throws — failures are stored on the run row.
 * Returns null when the job is gone or already running.
 */
export async function executeJob(
  jobId: string,
  trigger: "manual" | "schedule" = "manual"
): Promise<string | null> {
  const opened = await openRun(jobId, trigger)
  if (opened.status === "conflict") {
    logger.warn({ jobId, trigger }, "job is already running, skipping")
    return null
  }
  if (opened.status !== "opened") return null
  await completeRun(opened.job, opened.runId)
  return opened.runId
}

/**
 * Start a job execution without waiting for the playbook to finish: records the
 * run, kicks off streaming in the background, and returns the run id right away
 * so callers (e.g. the "run now" RPC) can respond immediately. The run is live
 * from the moment this returns — `jobs.runs.watch(runId)` can attach to it
 * immediately, or at any later point while it's still going.
 */
export async function startJobRun(
  jobId: string,
  trigger: "manual" | "schedule" = "manual"
): Promise<
  | { status: "opened"; runId: string }
  | { status: "not_found" }
  | { status: "conflict" }
> {
  const opened = await openRun(jobId, trigger)
  if (opened.status !== "opened") return opened
  void completeRun(opened.job, opened.runId).catch((err) => {
    logger.error({ runId: opened.runId, err }, "run failed")
  })
  return { status: "opened", runId: opened.runId }
}
