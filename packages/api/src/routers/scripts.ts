import { z } from "zod"
import { scriptsHandler } from "@/handlers/scripts"
import { protectedProcedure } from "@/index"

export const scriptsRouter = {
  create: protectedProcedure
    .route({
      summary: "Create a script",
      description: "Creates a new bash script.",
      tags: ["Scripts"],
      method: "POST",
    })
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        content: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const script = await scriptsHandler.create(input)
      return script ?? null
    }),

  list: protectedProcedure
    .route({
      summary: "List scripts",
      description: "Lists all stored bash scripts.",
      tags: ["Scripts"],
      method: "GET",
    })
    .handler(async () => {
      const scripts = await scriptsHandler.list()
      return scripts ?? []
    }),

  get: protectedProcedure
    .route({
      summary: "Get a script",
      description: "Gets a bash script by ID.",
      tags: ["Scripts"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const script = await scriptsHandler.get(input.id)
      return script ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a script",
      description: "Updates a bash script by ID.",
      tags: ["Scripts"],
      method: "PUT",
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        content: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const script = await scriptsHandler.update(input.id, input)
      return script ?? null
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a script",
      description: "Deletes a bash script by ID.",
      tags: ["Scripts"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const script = await scriptsHandler.delete(input.id)
      return script ?? null
    }),
}
