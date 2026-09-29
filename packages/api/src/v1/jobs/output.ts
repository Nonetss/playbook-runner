import { eventIterator } from "@orpc/server"
import { z } from "zod"
import { taskEventSchema } from "#v1/run/router"

const runStatus = z.enum(["pending", "running", "ok", "failed"])

// A job as stored in the database.
const job = z.object({
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
const jobRun = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  status: runStatus,
  trigger: z.string(),
  eventsJson: z.array(z.record(z.string(), z.unknown())).nullable(),
  error: z.string().nullable(),
  // Per-host recap counts; null when the run produced no `playbook_on_stats`
  // (still in flight, or it failed before Ansible reported).
  hostsOk: z.number().int().nullable(),
  hostsFailed: z.number().int().nullable(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
})

// `run` only returns the new run id — keep it a tight, focused schema.
const startRunResult = z.object({ runId: z.string() })

// Terminal value of `runs.watch`'s event iterator. `null` means the run
// wasn't (or is no longer) live — the caller should fall back to whatever
// `runs.list`/`runs.get` already has persisted for it.
const jobRunWatchResult = z
  .object({
    runId: z.string(),
    status: z.enum(["ok", "failed"]),
    ok: z.boolean(),
  })
  .nullable()

/**
 * One row in the global run feed. Slimmer than `jobRun` because the feed
 * never needs the captured SSE events; it omits `eventsJson` and `error`
 * (those live on the per-run detail endpoint). `jobName` is null when the
 * parent job was deleted; the frontend renders a placeholder.
 */
const jobRunFeedRow = z.object({
  id: z.string(),
  jobId: z.string().nullable(),
  jobName: z.string().nullable(),
  status: runStatus,
  trigger: z.string(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
  durationMs: z.number().int().nullable(),
  // Per-host recap counts. A `failed` run with `hostsOk > 0` is a partial
  // failure — the feed renders it amber with the split instead of flat red.
  hostsOk: z.number().int().nullable(),
  hostsFailed: z.number().int().nullable(),
})

const jobRunFeedPage = z.object({
  runs: z.array(jobRunFeedRow),
  nextCursor: z.string().nullable(),
})

const jobRunMetrics = z.object({
  window: z.enum(["24h", "7d", "30d"]),
  total: z.number().int(),
  okCount: z.number().int(),
  failedCount: z.number().int(),
  // Always present; 0 means "no runs in window" (well-defined, not NaN).
  successRate: z.number().min(0).max(1),
  avgDurationMs: z.number().min(0),
})

const jobRollup = z.object({
  jobId: z.string(),
  jobName: z.string(),
  latestRunId: z.string().nullable(),
  latestStatus: runStatus.nullable(),
  latestCreatedAt: z.coerce.date().nullable(),
  latestDurationMs: z.number().int().nullable(),
  recentSuccessRatio: z.number().min(0).max(1),
  recentRunCount: z.number().int(),
})

export const jobsOutput = {
  list: z.array(job),
  get: job,
  create: job,
  update: job,
  delete: job,
  toggleEnabled: job,
  run: startRunResult,
}

export const jobRunsOutput = {
  watch: eventIterator(taskEventSchema, jobRunWatchResult),
  list: z.array(jobRun),
  get: jobRun,
  listAll: jobRunFeedPage,
  metrics: jobRunMetrics,
  rollups: z.array(jobRollup),
}

export type Job = z.infer<typeof job>
export type JobRun = z.infer<typeof jobRun>
export type JobRunFeedRow = z.infer<typeof jobRunFeedRow>
export type JobRunFeedPage = z.infer<typeof jobRunFeedPage>
export type JobRunMetrics = z.infer<typeof jobRunMetrics>
export type JobRollup = z.infer<typeof jobRollup>
