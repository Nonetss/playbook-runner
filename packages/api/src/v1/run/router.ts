import { protectedProcedure } from "#index"
import { runInput } from "#v1/run/input"
import { runOutput } from "#v1/run/output"
import { streamHandler } from "#v1/run/stream-handler"

// Re-exported for `#v1/jobs/router`, which imports the event shape from here.
export { taskEventSchema } from "#v1/run/output"

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
    .input(runInput.ping)
    .output(runOutput.ping)
    .errors(resolveErrors)
    .handler(({ context, input }) => streamHandler.ping({ context, input })),

  run: protectedProcedure
    .route({
      summary: "Run a playbook",
      description:
        "Resolves a playbook + inventory selection (expanding groups to devices), then streams the playbook run.",
      tags: ["Run"],
      method: "POST",
    })
    .input(runInput.run)
    .output(runOutput.run)
    .errors(resolveErrors)
    .handler(({ context, input }) => streamHandler.run({ context, input })),

  command: protectedProcedure
    .route({
      summary: "Run an ad-hoc command",
      description:
        "Resolves an inventory selection (no playbook), then streams an ad-hoc `shell`/`command` module run against the resolved hosts.",
      tags: ["Run"],
      method: "POST",
    })
    .input(runInput.command)
    .output(runOutput.command)
    .errors(resolveErrors)
    .handler(({ context, input }) => streamHandler.command({ context, input })),

  script: protectedProcedure
    .route({
      summary: "Run a stored script",
      description:
        "Resolves a stored script + inventory selection, then streams the script run (Ansible `script` module) against the resolved hosts.",
      tags: ["Run"],
      method: "POST",
    })
    .input(runInput.script)
    .output(runOutput.script)
    .errors(resolveErrors)
    .handler(({ context, input }) => streamHandler.script({ context, input })),
}
