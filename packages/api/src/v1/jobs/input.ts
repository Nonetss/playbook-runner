import z from "zod"

const item = z.object({ id: z.string(), type: z.enum(["group", "device"]) })
const job = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  playbookId: z.string().nullable().optional(),
  inventoryJson: z.array(item).default([]),
  extravarsJson: z.record(z.string(), z.string()).default({}),
  forks: z.number().int().min(1).default(1),
  cronExpression: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
})

export const jobsInput = {
  job,
  get: z.object({ id: z.string() }),
  update: job.partial().extend({ id: z.string() }),
  remove: z.object({ id: z.string() }),
  run: z.object({ id: z.string() }),
  listRuns: z.object({ jobId: z.string() }),
}
