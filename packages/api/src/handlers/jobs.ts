import { db } from "@playbook-runner/db"
import {
  jobRuns,
  jobs,
  type NewJob,
  type NewJobRun,
} from "@playbook-runner/db/schema/jobs"
import { asc, desc, eq } from "drizzle-orm"

export const jobsHandler = {
  create: async (job: Omit<NewJob, "id" | "createdAt" | "updatedAt">) => {
    const j = await db.insert(jobs).values(job).returning()
    return j[0] ?? null
  },

  list: async () => {
    return db.select().from(jobs).orderBy(asc(jobs.createdAt))
  },

  /** Enabled jobs that carry a cron expression — the scheduler's source set. */
  listScheduled: async () => {
    return db
      .select({ id: jobs.id, cronExpression: jobs.cronExpression })
      .from(jobs)
      .where(eq(jobs.enabled, true))
  },

  get: async (id: string) => {
    const j = await db.select().from(jobs).where(eq(jobs.id, id))
    return j[0] ?? null
  },

  update: async (
    id: string,
    job: Partial<Omit<NewJob, "id" | "createdAt" | "updatedAt">>
  ) => {
    const j = await db
      .update(jobs)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning()
    return j[0] ?? null
  },

  delete: async (id: string) => {
    const j = await db.delete(jobs).where(eq(jobs.id, id)).returning()
    return j[0] ?? null
  },
}

export const jobRunsHandler = {
  create: async (run: Omit<NewJobRun, "id" | "createdAt">) => {
    const r = await db.insert(jobRuns).values(run).returning()
    return r[0] ?? null
  },

  listByJob: async (jobId: string) => {
    return db
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.jobId, jobId))
      .orderBy(desc(jobRuns.createdAt))
  },

  get: async (id: string) => {
    const r = await db.select().from(jobRuns).where(eq(jobRuns.id, id))
    return r[0] ?? null
  },

  update: async (
    id: string,
    run: Partial<Omit<NewJobRun, "id" | "createdAt">>
  ) => {
    const r = await db
      .update(jobRuns)
      .set(run)
      .where(eq(jobRuns.id, id))
      .returning()
    return r[0] ?? null
  },
}
