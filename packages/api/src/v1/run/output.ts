import { eventIterator } from "@orpc/server"
import { z } from "zod"

export const statsSchema = z.object({
  ok: z.record(z.string(), z.number()),
  changed: z.record(z.string(), z.number()),
  failures: z.record(z.string(), z.number()),
  dark: z.record(z.string(), z.number()),
  skipped: z.record(z.string(), z.number()),
})

// A single ansible-runner event, reduced to the fields the frontend renders.
// Shared with `#v1/jobs/router`'s `runs.stream` — same event shape either way.
export const taskEventSchema = z.object({
  event: z.string(),
  host: z.string().optional(),
  play: z.string().optional(),
  task: z.string().optional(),
  task_action: z.string().optional(),
  changed: z.boolean().optional(),
  msg: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  rc: z.number().int().optional(),
  stats: statsSchema.optional(),
})

// Terminal value of the event iterator, once the run finishes.
export const runResultSchema = z.object({
  status: z.string(),
  rc: z.number().int(),
  ok: z.boolean(),
})

const runStream = eventIterator(taskEventSchema, runResultSchema)

export const runOutput = {
  ping: runStream,
  run: runStream,
  command: runStream,
  script: runStream,
}
