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
