import { executeJob } from "@playbook-runner/api/v1/jobs/executor"
import { jobsHandler } from "@playbook-runner/api/v1/jobs/handler"
import { db } from "@playbook-runner/db"
import { jobRuns } from "@playbook-runner/db/schema/jobs"
import { env } from "@playbook-runner/env/server"
import { logger } from "@playbook-runner/logger"
import { eq } from "drizzle-orm"

/** How often (ms) the scheduler reconciles its cron set against the DB. */
const RECONCILE_INTERVAL_MS = 60_000

type ScheduledEntry = { job: Bun.CronJob; pattern: string }

const scheduled = new Map<string, ScheduledEntry>()
let reconcileTimer: ReturnType<typeof setInterval> | null = null

function isValidPattern(pattern: string): boolean {
  try {
    return Bun.cron.parse(pattern) !== null
  } catch {
    return false
  }
}

function schedule(jobId: string, pattern: string) {
  // Bun.cron computes the next fire only after the handler settles, so a slow
  // playbook can't stack overlapping executions of the same job.
  const job = Bun.cron(pattern, async () => {
    try {
      await executeJob(jobId, "schedule")
    } catch (err) {
      logger.error({ jobId, err }, "scheduled job failed")
    }
  })
  scheduled.set(jobId, { job, pattern })
}

function unschedule(jobId: string) {
  const entry = scheduled.get(jobId)
  if (entry) {
    entry.job.stop()
    scheduled.delete(jobId)
  }
}

/**
 * Bring the in-memory cron set in line with the DB: schedule enabled jobs that
 * have a (valid) cron expression, drop the rest, and recreate any whose
 * expression changed. Cheap enough to run every minute.
 */
async function reconcile() {
  const rows = await jobsHandler.listScheduled()
  const seen = new Set<string>()

  for (const row of rows) {
    const pattern = row.cronExpression?.trim()
    if (!pattern || !isValidPattern(pattern)) continue
    seen.add(row.id)

    const existing = scheduled.get(row.id)
    if (!existing) {
      schedule(row.id, pattern)
    } else if (existing.pattern !== pattern) {
      unschedule(row.id)
      schedule(row.id, pattern)
    }
  }

  // Remove jobs that are no longer enabled / scheduled / present.
  for (const jobId of scheduled.keys()) {
    if (!seen.has(jobId)) unschedule(jobId)
  }
}

/**
 * Mark any run left in "running" status as failed. A "running" row can only
 * survive to the next boot if the previous process died mid-run (a live
 * process always settles its own runs to a terminal status), so this should
 * run once at startup, before the scheduler starts firing new runs.
 */
export async function recoverOrphanedRuns() {
  const recovered = await db
    .update(jobRuns)
    .set({
      status: "failed",
      error: "El proceso se reinició mientras el job estaba en ejecución",
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.status, "running"))
    .returning({ id: jobRuns.id })

  if (recovered.length > 0) {
    logger.warn(
      { count: recovered.length, runIds: recovered.map((r) => r.id) },
      "recovered orphaned job runs"
    )
  }
}

/** Start the background job scheduler. Idempotent. */
export function startJobScheduler() {
  if (env.JOB_SCHEDULER_ENABLED !== "1") {
    logger.info("job scheduler disabled via JOB_SCHEDULER_ENABLED")
    return
  }
  if (reconcileTimer) return

  void reconcile().catch((err) =>
    logger.error({ err }, "initial reconcile failed")
  )
  reconcileTimer = setInterval(() => {
    void reconcile().catch((err) => logger.error({ err }, "reconcile failed"))
  }, RECONCILE_INTERVAL_MS)

  logger.info("job scheduler started")
}

/** Stop the scheduler and clear all scheduled jobs (for tests / shutdown). */
export function stopJobScheduler() {
  if (reconcileTimer) {
    clearInterval(reconcileTimer)
    reconcileTimer = null
  }
  for (const jobId of scheduled.keys()) unschedule(jobId)
}
