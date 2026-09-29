import { z } from "zod"
import { cronExpression, forks } from "#v1/jobs/cron"
import { safeExtravars } from "#v1/run/extravars"
import { idSchema } from "#v1/schemas"

const inventoryItem = z.object({
  id: z.string(),
  type: z.enum(["group", "device"]),
})

const job = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  playbookId: idSchema.nullable().optional(),
  inventoryJson: z.array(inventoryItem).default([]),
  extravarsJson: safeExtravars.default({}),
  forks: forks.default(1),
  cronExpression,
  enabled: z.boolean().default(true),
})

const byId = z.object({ id: idSchema })

export const jobsInput = {
  get: byId,
  create: job,
  // Full replace: every editable field is (re)written.
  update: job.extend({ id: idSchema }),
  delete: byId,
  toggleEnabled: z.object({ id: idSchema, enabled: z.boolean() }),
  run: byId,
}

export const jobRunsInput = {
  watch: z.object({ runId: idSchema }),
  list: z.object({ jobId: idSchema }),
  get: byId,
  listAll: z.object({
    limit: z.number().int().min(1).max(100).default(25),
    cursor: z.string().optional(),
  }),
  metrics: z.object({ window: z.enum(["24h", "7d", "30d"]) }),
  rollups: z.object({}).default({}),
}
