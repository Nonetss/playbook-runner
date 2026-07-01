import { ORPCError } from "@orpc/server"
import z from "zod"
import {
  ResolveRunCredentiallessError,
  ResolveRunNotFoundError,
  ResolveRunValidationError,
  runHandler,
} from "@/handlers/run"
import { protectedProcedure } from "@/index"

const inventorySelectionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["group", "device"]),
})

const hostSchema = z.object({
  name: z.string(),
  address: z.string(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string(),
  privateKey: z.string(),
  connection: z.literal("ssh"),
})

const resolveOutputSchema = z.object({
  playbook: z.object({
    name: z.string(),
    content: z.string(),
  }),
  hosts: z.array(hostSchema),
})

const resolveHostsOutputSchema = z.object({
  hosts: z.array(hostSchema),
})

const resolveScriptOutputSchema = z.object({
  script: z.object({
    name: z.string(),
    content: z.string(),
    language: z.enum(["bash", "python"]),
  }),
  hosts: z.array(hostSchema),
})

export const runRouter = {
  resolve: protectedProcedure
    .route({
      summary: "Resolve a playbook run",
      description:
        "Resolves a playbook + inventory selection into an executable bundle: playbook content and a de-duplicated list of target hosts with credentials. Group selections are expanded to devices via the device-group relation.",
      tags: ["Run"],
      method: "POST",
    })
    .input(
      z.object({
        playbookId: z.string().uuid(),
        inventory: z.array(inventorySelectionSchema).min(1),
      })
    )
    .output(resolveOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Playbook not found",
        status: 404,
      },
      PRECONDITION_FAILED: {
        message: "One or more devices have no credential",
        status: 412,
      },
      BAD_REQUEST: {
        message: "Inventory selection is empty or contains unknown devices",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await runHandler.resolveRun(input.playbookId, input.inventory)
      } catch (err) {
        if (err instanceof ResolveRunNotFoundError) {
          throw new ORPCError("NOT_FOUND", { message: err.message })
        }
        if (err instanceof ResolveRunCredentiallessError) {
          throw new ORPCError("PRECONDITION_FAILED", { message: err.message })
        }
        if (err instanceof ResolveRunValidationError) {
          throw new ORPCError("BAD_REQUEST", { message: err.message })
        }
        throw err
      }
    }),

  resolveHosts: protectedProcedure
    .route({
      summary: "Resolve hosts for an inventory selection",
      description:
        "Resolves an inventory selection (devices and/or groups) into a de-duplicated list of hosts with credentials, without requiring a playbook. Group selections are expanded to devices via the device-group relation. Used by ad-hoc command execution.",
      tags: ["Run"],
      method: "POST",
    })
    .input(
      z.object({
        inventory: z.array(inventorySelectionSchema).min(1),
      })
    )
    .output(resolveHostsOutputSchema)
    .errors({
      PRECONDITION_FAILED: {
        message: "One or more devices have no credential",
        status: 412,
      },
      BAD_REQUEST: {
        message: "Inventory selection is empty or contains unknown devices",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return { hosts: await runHandler.resolveHosts(input.inventory) }
      } catch (err) {
        if (err instanceof ResolveRunCredentiallessError) {
          throw new ORPCError("PRECONDITION_FAILED", { message: err.message })
        }
        if (err instanceof ResolveRunValidationError) {
          throw new ORPCError("BAD_REQUEST", { message: err.message })
        }
        throw err
      }
    }),

  resolveScript: protectedProcedure
    .route({
      summary: "Resolve a script + inventory selection",
      description:
        "Resolves a stored script (name + content) and an inventory selection into an executable bundle. Reuses host resolution from `resolve` (group expansion, credential join, dedupe).",
      tags: ["Run"],
      method: "POST",
    })
    .input(
      z.object({
        scriptId: z.string().uuid(),
        inventory: z.array(inventorySelectionSchema).min(1),
      })
    )
    .output(resolveScriptOutputSchema)
    .errors({
      NOT_FOUND: {
        message: "Script not found",
        status: 404,
      },
      PRECONDITION_FAILED: {
        message: "One or more devices have no credential",
        status: 412,
      },
      BAD_REQUEST: {
        message: "Inventory selection is empty or contains unknown devices",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await runHandler.resolveScript(input.scriptId, input.inventory)
      } catch (err) {
        if (err instanceof ResolveRunNotFoundError) {
          throw new ORPCError("NOT_FOUND", { message: err.message })
        }
        if (err instanceof ResolveRunCredentiallessError) {
          throw new ORPCError("PRECONDITION_FAILED", { message: err.message })
        }
        if (err instanceof ResolveRunValidationError) {
          throw new ORPCError("BAD_REQUEST", { message: err.message })
        }
        throw err
      }
    }),

  resolveDevice: protectedProcedure
    .route({
      summary: "Resolve a single device for diagnostic runs",
      description:
        "Returns the host (address, port, username, private key) for a single device, looked up by id. Used by the ansible service to run ad-hoc tasks (ping, etc.) against a stored device without going through a playbook.",
      tags: ["Run"],
      method: "POST",
    })
    .input(z.object({ deviceId: z.string().uuid() }))
    .output(hostSchema)
    .errors({
      NOT_FOUND: {
        message: "Device not found",
        status: 404,
      },
      PRECONDITION_FAILED: {
        message: "Device has no credential associated",
        status: 412,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await runHandler.resolveDevice(input.deviceId)
      } catch (err) {
        if (err instanceof ResolveRunNotFoundError) {
          throw new ORPCError("NOT_FOUND", { message: err.message })
        }
        if (err instanceof ResolveRunCredentiallessError) {
          throw new ORPCError("PRECONDITION_FAILED", { message: err.message })
        }
        throw err
      }
    }),
}
