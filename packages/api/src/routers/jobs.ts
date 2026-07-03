import { z } from "zod"
import { jobRunsHandler, jobsHandler } from "#handlers/jobs"
import { protectedProcedure } from "#index"
import { startJobRun } from "#jobs/executor"

// ---------- Response schemas (colocated) -------------------------------------

// A job as stored on disk.
const jobSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  playbookId: z.string().nullable(),
  inventoryJson: z
    .array(z.object({ id: z.string(), type: z.enum(["group", "device"]) }))
    .nullable(),
  extravarsJson: z.record(z.string(), z.string()).nullable(),
  forks: z.number().int(),
  cronExpression: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

// A single execution row; this is also part of the scheduler's source-of-truth
// for "what ran against which playbook when".
const jobRunSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  status: z.enum(["pending", "running", "ok", "failed"]),
  trigger: z.string(),
  eventsJson: z.array(z.record(z.string(), z.unknown())).nullable(),
  error: z.string().nullable(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
})

// `run` only returns the new run id — keep it a tight, focused schema.
// `runId` may be null when `startJobRun` cannot acquire a job (job deleted
// between request read and lock acquire); the frontend treats this as a
// failure and surfaces the corresponding error.
const startRunResultSchema = z.object({
  runId: z.string().nullable(),
})

// ---------- Run feed / metrics output schemas ---------------------------------

/**
 * One row in the global run feed. Slimmer than the full `jobRunSchema`
 * because the feed never needs the captured SSE events; it omits
 * `eventsJson` and `error` (those live on the per-run detail endpoint).
 * `jobName` is null when the parent job was deleted; the API surface keeps
 * it nullable here and the frontend renders a placeholder rather than
 * coercing on the wire.
 */
const jobRunFeedRowSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  jobName: z.string().nullable(),
  status: z.enum(["pending", "running", "ok", "failed"]),
  trigger: z.string(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
  durationMs: z.number().int().nullable(),
})

const jobRunFeedPageSchema = z.object({
  runs: z.array(jobRunFeedRowSchema),
  nextCursor: z.string().nullable(),
})

const jobRunMetricsSchema = z.object({
  window: z.enum(["24h", "7d", "30d"]),
  total: z.number().int(),
  okCount: z.number().int(),
  failedCount: z.number().int(),
  // Always present; 0 means "no runs in window" (well-defined, not NaN).
  successRate: z.number().min(0).max(1),
  avgDurationMs: z.number().min(0),
})

const jobRollupSchema = z.object({
  jobId: z.string(),
  jobName: z.string(),
  latestRunId: z.string().nullable(),
  latestStatus: z.enum(["pending", "running", "ok", "failed"]).nullable(),
  latestCreatedAt: z.coerce.date().nullable(),
  latestDurationMs: z.number().int().nullable(),
  recentSuccessRatio: z.number().min(0).max(1),
  recentRunCount: z.number().int(),
})

export type Job = z.infer<typeof jobSchema>
export type JobRun = z.infer<typeof jobRunSchema>
export type JobRunFeedRow = z.infer<typeof jobRunFeedRowSchema>
export type JobRunFeedPage = z.infer<typeof jobRunFeedPageSchema>
export type JobRunMetrics = z.infer<typeof jobRunMetricsSchema>
export type JobRollup = z.infer<typeof jobRollupSchema>

// ---------- Inputs ----------------------------------------------------------

const inventoryItemSchema = z.object({
  id: z.string(),
  type: z.enum(["group", "device"]),
})

const jobInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  playbookId: z.string().optional(),
  inventoryJson: z.array(inventoryItemSchema).default([]),
  extravarsJson: z.record(z.string(), z.string()).default({}),
  forks: z.number().int().min(1).default(1),
  cronExpression: z.string().optional(),
  enabled: z.boolean().default(true),
})

// ---------- Router ----------------------------------------------------------

export const jobsRouter = {
  list: protectedProcedure
    .route({
      summary: "List jobs",
      description: "Returns every stored job, ordered by creation time.",
      tags: ["Jobs"],
      method: "GET",
    })
    .output(z.array(jobSchema))
    .handler(async () => {
      return jobsHandler.list()
    }),

  get: protectedProcedure
    .route({
      summary: "Get a job",
      description: "Returns a single job by id, or null when no row matches.",
      tags: ["Jobs"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .output(jobSchema.nullable())
    .handler(async ({ input }) => {
      return jobsHandler.get(input.id)
    }),

  create: protectedProcedure
    .route({
      summary: "Create a job",
      description:
        "Persists a new scheduled/manual job. The cron expression is optional; omit it to create a manual-only job.",
      tags: ["Jobs"],
      method: "POST",
    })
    .input(jobInputSchema)
    .output(jobSchema.nullable())
    .handler(async ({ input }) => {
      return jobsHandler.create({
        name: input.name,
        description: input.description ?? null,
        playbookId: input.playbookId ?? null,
        inventoryJson: input.inventoryJson,
        extravarsJson: input.extravarsJson as Record<string, string>,
        forks: input.forks,
        cronExpression: input.cronExpression ?? null,
        enabled: input.enabled,
      })
    }),

  update: protectedProcedure
    .route({
      summary: "Update a job",
      description: "Replaces every editable field of an existing job.",
      tags: ["Jobs"],
      method: "PUT",
    })
    .input(jobInputSchema.extend({ id: z.string() }))
    .output(jobSchema.nullable())
    .handler(async ({ input }) => {
      const { id, ...rest } = input
      return jobsHandler.update(id, {
        name: rest.name,
        description: rest.description ?? null,
        playbookId: rest.playbookId ?? null,
        inventoryJson: rest.inventoryJson,
        extravarsJson: rest.extravarsJson as Record<string, string>,
        forks: rest.forks,
        cronExpression: rest.cronExpression ?? null,
        enabled: rest.enabled,
      })
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a job",
      description: "Deletes a job by id. Returns the deleted row, or null.",
      tags: ["Jobs"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .output(jobSchema.nullable())
    .handler(async ({ input }) => {
      return jobsHandler.delete(input.id)
    }),

  toggleEnabled: protectedProcedure
    .route({
      summary: "Toggle job enabled state",
      description:
        "Enables or disables a job without touching its other fields. Disabled jobs are skipped by the scheduler.",
      tags: ["Jobs"],
      method: "PUT",
    })
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .output(jobSchema.nullable())
    .handler(async ({ input }) => {
      return jobsHandler.update(input.id, { enabled: input.enabled })
    }),

  run: protectedProcedure
    .route({
      summary: "Run a job now",
      description:
        "Triggers an immediate execution of the job's playbook against its inventory and records the run with its captured output.",
      tags: ["Jobs"],
      method: "POST",
    })
    .input(z.object({ id: z.string() }))
    .output(startRunResultSchema)
    .handler(async ({ input }) => {
      const runId = await startJobRun(input.id, "manual")
      return { runId }
    }),

  runs: {
    list: protectedProcedure
      .route({
        summary: "List runs for a job",
        description: "Returns every recorded run of a given job, newest first.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(z.object({ jobId: z.string() }))
      .output(z.array(jobRunSchema))
      .handler(async ({ input }) => {
        return jobRunsHandler.listByJob(input.jobId)
      }),

    get: protectedProcedure
      .route({
        summary: "Get a job run",
        description:
          "Returns a single job run by id, or null when no row matches.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(z.object({ id: z.string() }))
      .output(jobRunSchema.nullable())
      .handler(async ({ input }) => {
        return jobRunsHandler.get(input.id)
      }),

    listAll: protectedProcedure
      .route({
        summary: "List runs across all jobs",
        description:
          "Paginated, most-recent-first feed of job runs across every job. Each row carries the parent job name (or a placeholder when the job was deleted) plus a derived `durationMs` (null while in flight). Pass the returned `nextCursor` to fetch the next page.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(25),
          cursor: z.string().optional(),
        })
      )
      .output(jobRunFeedPageSchema)
      .handler(async ({ input }) => {
        return jobRunsHandler.listAll({
          limit: input.limit,
          cursor: input.cursor,
        })
      }),

    metrics: protectedProcedure
      .route({
        summary: "Aggregate run metrics over a window",
        description:
          "Returns total / success / failed counts, success rate, and average finished-run duration computed over a caller-selected time window. Empty windows return zeroed counts with successRate=0 (not a division-by-zero error).",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(
        z.object({
          window: z.enum(["24h", "7d", "30d"]),
        })
      )
      .output(jobRunMetricsSchema)
      .handler(async ({ input }) => {
        return jobRunsHandler.metrics({ window: input.window })
      }),

    rollups: protectedProcedure
      .route({
        summary: "Per-job run rollups",
        description:
          "Returns each job with its latest run status, the most recent run's duration, and the success ratio across its last 10 runs. Jobs that have never run appear with null latest status and zero success ratio.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(z.object({}).default({}))
      .output(z.array(jobRollupSchema))
      .handler(async () => {
        return jobRunsHandler.perJobRollups()
      }),
  },
}
