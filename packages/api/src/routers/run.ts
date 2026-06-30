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
}
