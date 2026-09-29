import { db } from "@playbook-runner/db"
import { jobs } from "@playbook-runner/db/schema/jobs"
import { eq } from "drizzle-orm"

/** Enabled jobs with their cron expression — the scheduler's source set. */
export function listScheduledJobs() {
  return db
    .select({ id: jobs.id, cronExpression: jobs.cronExpression })
    .from(jobs)
    .where(eq(jobs.enabled, true))
}
