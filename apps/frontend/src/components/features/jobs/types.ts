export type InventoryItem = { id: string; type: "group" | "device" }

export type Job = {
  id: string
  name: string
  description: string | null
  playbookId: string | null
  inventoryJson: InventoryItem[]
  extravarsJson: Record<string, string>
  forks: number
  cronExpression: string | null
  enabled: boolean
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

export type JobRunStatus = "pending" | "running" | "ok" | "failed"

export type JobRun = {
  id: string
  jobId: string | null
  status: JobRunStatus
  startedAt: Date | string | null
  finishedAt: Date | string | null
  createdAt: Date | string | null
}
