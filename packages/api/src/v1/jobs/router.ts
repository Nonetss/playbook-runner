import { protectedProcedure } from "#index"
import { jobRunsHandler, jobsHandler } from "#v1/jobs/handler"
import { jobRunsInput, jobsInput } from "#v1/jobs/input"
import { jobRunsOutput, jobsOutput } from "#v1/jobs/output"

export type {
  Job,
  JobRollup,
  JobRun,
  JobRunFeedPage,
  JobRunFeedRow,
  JobRunMetrics,
} from "#v1/jobs/output"

export const jobsRouter = {
  list: protectedProcedure
    .route({
      summary: "List jobs",
      description: "Returns every stored job, ordered by creation time.",
      tags: ["Jobs"],
      method: "GET",
    })
    .output(jobsOutput.list)
    .handler(({ context }) => jobsHandler.list({ context })),
  get: protectedProcedure
    .route({
      summary: "Get a job",
      description:
        "Returns a single job by id. Throws NOT_FOUND when no row matches.",
      tags: ["Jobs"],
      method: "GET",
    })
    .input(jobsInput.get)
    .output(jobsOutput.get)
    .handler(({ context, input }) => jobsHandler.get({ context, input })),
  create: protectedProcedure
    .route({
      summary: "Create a job",
      description:
        "Persists a new scheduled/manual job. The cron expression is optional; omit it to create a manual-only job.",
      tags: ["Jobs"],
      method: "POST",
    })
    .input(jobsInput.create)
    .output(jobsOutput.create)
    .handler(({ context, input }) => jobsHandler.create({ context, input })),
  update: protectedProcedure
    .route({
      summary: "Update a job",
      description: "Replaces every editable field of an existing job.",
      tags: ["Jobs"],
      method: "PUT",
    })
    .input(jobsInput.update)
    .output(jobsOutput.update)
    .handler(({ context, input }) => jobsHandler.update({ context, input })),
  delete: protectedProcedure
    .route({
      summary: "Delete a job",
      description:
        "Deletes a job by id and returns the deleted row. Throws NOT_FOUND when no row matches.",
      tags: ["Jobs"],
      method: "DELETE",
    })
    .input(jobsInput.delete)
    .output(jobsOutput.delete)
    .handler(({ context, input }) => jobsHandler.delete({ context, input })),
  toggleEnabled: protectedProcedure
    .route({
      summary: "Toggle job enabled state",
      description:
        "Enables or disables a job without touching its other fields. Disabled jobs are skipped by the scheduler.",
      tags: ["Jobs"],
      method: "PUT",
    })
    .input(jobsInput.toggleEnabled)
    .output(jobsOutput.toggleEnabled)
    .handler(({ context, input }) =>
      jobsHandler.toggleEnabled({ context, input })
    ),
  run: protectedProcedure
    .route({
      summary: "Run a job now",
      description:
        "Triggers an immediate execution of the job's playbook against its inventory and records the run with its captured output. Returns CONFLICT while the job already has a running run.",
      tags: ["Jobs"],
      method: "POST",
    })
    .input(jobsInput.run)
    .output(jobsOutput.run)
    .handler(({ context, input }) => jobsHandler.run({ context, input })),
  runs: {
    watch: protectedProcedure
      .route({
        summary: "Watch a job run live",
        description:
          "Attaches to a run's live events — from the scheduler, another tab's `run`, or this one — as an event iterator: replays whatever already happened, then streams the rest until it finishes. Returns `null` immediately if the run isn't (or is no longer) live, e.g. it already finished; callers should fall back to `runs.list`/`runs.get` in that case.",
        tags: ["Jobs"],
        method: "POST",
      })
      .input(jobRunsInput.watch)
      .output(jobRunsOutput.watch)
      .handler(({ context, input }) =>
        jobRunsHandler.watch({ context, input })
      ),
    list: protectedProcedure
      .route({
        summary: "List runs for a job",
        description: "Returns every recorded run of a given job, newest first.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(jobRunsInput.list)
      .output(jobRunsOutput.list)
      .handler(({ context, input }) => jobRunsHandler.list({ context, input })),
    get: protectedProcedure
      .route({
        summary: "Get a job run",
        description:
          "Returns a single job run by id. Throws NOT_FOUND when no row matches.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(jobRunsInput.get)
      .output(jobRunsOutput.get)
      .handler(({ context, input }) => jobRunsHandler.get({ context, input })),
    listAll: protectedProcedure
      .route({
        summary: "List runs across all jobs",
        description:
          "Paginated, most-recent-first feed of job runs across every job. Each row carries the parent job name (or a placeholder when the job was deleted) plus a derived `durationMs` (null while in flight). Pass the returned `nextCursor` to fetch the next page.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(jobRunsInput.listAll)
      .output(jobRunsOutput.listAll)
      .handler(({ context, input }) =>
        jobRunsHandler.listAll({ context, input })
      ),
    metrics: protectedProcedure
      .route({
        summary: "Aggregate run metrics over a window",
        description:
          "Returns total / success / failed counts, success rate, and average finished-run duration computed over a caller-selected time window. Empty windows return zeroed counts with successRate=0 (not a division-by-zero error).",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(jobRunsInput.metrics)
      .output(jobRunsOutput.metrics)
      .handler(({ context, input }) =>
        jobRunsHandler.metrics({ context, input })
      ),
    rollups: protectedProcedure
      .route({
        summary: "Per-job run rollups",
        description:
          "Returns each job with its latest run status, the most recent run's duration, and the success ratio across its last 10 runs. Jobs that have never run appear with null latest status and zero success ratio.",
        tags: ["Jobs"],
        method: "GET",
      })
      .input(jobRunsInput.rollups)
      .output(jobRunsOutput.rollups)
      .handler(({ context, input }) =>
        jobRunsHandler.rollups({ context, input })
      ),
  },
}
