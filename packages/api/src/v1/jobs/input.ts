import { z } from "zod"
import { cronExpression, forks } from "#v1/jobs/cron"
import { safeExtravars } from "#v1/run/extravars"
import { inventorySelection } from "#v1/run/selection"
import { idSchema } from "#v1/schemas"

const job = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  playbookId: idSchema.nullable().optional(),
  inventoryJson: z.array(inventorySelection).default([]),
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
  // `limit`/`offset` page the history; omit both to get every run.
  list: z.object({
    jobId: idSchema,
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  }),
  get: byId,
  listAll: z.object({
    limit: z.number().int().min(1).max(100).default(25),
    cursor: z.string().optional(),
  }),
  metrics: z.object({ window: z.enum(["24h", "7d", "30d"]) }),
  rollups: z.object({}).default({}),
}
