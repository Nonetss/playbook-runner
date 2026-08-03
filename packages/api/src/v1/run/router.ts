import { eventIterator } from "@orpc/server"
import { z } from "zod"
import { protectedProcedure } from "#index"
import { streamHandler } from "#v1/run/stream-handler"
import { streamInput } from "#v1/run/stream-input"

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
const runResultSchema = z.object({
  status: z.string(),
  rc: z.number().int(),
  ok: z.boolean(),
})

const resolveErrors = {
  NOT_FOUND: { status: 404, message: "Not Found" },
  BAD_REQUEST: { status: 400, message: "Bad Request" },
  PRECONDITION_FAILED: { status: 412, message: "Precondition Failed" },
  SERVICE_UNAVAILABLE: { status: 503, message: "Service Unavailable" },
} as const

/**
 * Ad-hoc / interactive execution: ping a device, run a playbook, run an
 * ad-hoc command, or run a stored script — each streams live progress back
 * to the browser as an oRPC event iterator. Resolves the selection against
 * the database (`runHandler`), then executes on the ansible service over
 * `RunnerService` (gRPC). Ansible itself never touches the database or a
 * user session; the backend is the only thing that talks to it.
 */
export const runRouter = {
  ping: protectedProcedure
    .route({
      summary: "Ping a device",
      description:
        "Resolves the device's stored SSH credential, then streams a one-task `ansible.builtin.ping` run against it.",
      tags: ["Run"],
      method: "POST",
    })
    .input(streamInput.ping)
    .output(eventIterator(taskEventSchema, runResultSchema))
    .errors(resolveErrors)
    .handler(({ input }) => streamHandler.ping(input)),

  run: protectedProcedure
    .route({
      summary: "Run a playbook",
      description:
        "Resolves a playbook + inventory selection (expanding groups to devices), then streams the playbook run.",
      tags: ["Run"],
      method: "POST",
    })
    .input(streamInput.run)
    .output(eventIterator(taskEventSchema, runResultSchema))
    .errors(resolveErrors)
    .handler(({ input }) => streamHandler.run(input)),

  command: protectedProcedure
    .route({
      summary: "Run an ad-hoc command",
      description:
        "Resolves an inventory selection (no playbook), then streams an ad-hoc `shell`/`command` module run against the resolved hosts.",
      tags: ["Run"],
      method: "POST",
    })
    .input(streamInput.command)
    .output(eventIterator(taskEventSchema, runResultSchema))
    .errors(resolveErrors)
    .handler(({ input }) => streamHandler.command(input)),

  script: protectedProcedure
    .route({
      summary: "Run a stored script",
      description:
        "Resolves a stored script + inventory selection, then streams the script run (Ansible `script` module) against the resolved hosts.",
      tags: ["Run"],
      method: "POST",
    })
    .input(streamInput.script)
    .output(eventIterator(taskEventSchema, runResultSchema))
    .errors(resolveErrors)
    .handler(({ input }) => streamHandler.script(input)),
}
