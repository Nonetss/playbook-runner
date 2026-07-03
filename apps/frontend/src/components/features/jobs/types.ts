export type InventoryItem = { id: string; type: "group" | "device" }

export type Job = {
  id: string
  name: string
  description: string | null
  playbookId: string | null
  inventoryJson: InventoryItem[] | null
  extravarsJson: Record<string, string> | null
  forks: number
  cronExpression: string | null
  enabled: boolean
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

export type JobRunStatus = "pending" | "running" | "ok" | "failed"

/** A single SSE event captured during a run (Ansible event payload). */
export type JobRunEvent = Record<string, unknown> & { event?: string }

export type JobRun = {
  id: string
  jobId: string | null
  status: JobRunStatus
  trigger: string
  eventsJson: JobRunEvent[] | null
  error: string | null
  startedAt: Date | string | null
  finishedAt: Date | string | null
  createdAt: Date | string | null
}

/**
 * One row in the cross-job feed (`jobs.runs.listAll`). Slimmer than `JobRun`
 * because the feed never carries the captured SSE events; those live on the
 * per-run detail endpoint. Includes the joined job name and a derived
 * `durationMs` so the UI doesn't need to recompute it.
 */
export type JobRunFeedRow = {
  id: string
  jobId: string | null
  jobName: string | null
  status: JobRunStatus
  trigger: string
  startedAt: Date | string | null
  finishedAt: Date | string | null
  createdAt: Date | string | null
  durationMs: number | null
}

export type JobRunMetricsWindow = "24h" | "7d" | "30d"

export type JobRunMetrics = {
  window: JobRunMetricsWindow
  total: number
  okCount: number
  failedCount: number
  successRate: number
  avgDurationMs: number
}

export type JobRollup = {
  jobId: string
  jobName: string
  latestRunId: string | null
  latestStatus: JobRunStatus | null
  latestCreatedAt: Date | string | null
  latestDurationMs: number | null
  recentSuccessRatio: number
  recentRunCount: number
}
