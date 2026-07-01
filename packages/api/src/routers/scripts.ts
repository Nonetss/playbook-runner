import { z } from "zod"
import { scriptsHandler } from "@/handlers/scripts"
import { protectedProcedure } from "@/index"

const scriptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  language: z.enum(["bash", "python"]),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Script = z.infer<typeof scriptSchema>

export const scriptsRouter = {
  create: protectedProcedure
    .route({
      summary: "Create a script",
      description:
        "Persists a new bash script (name, description, shell content).",
      tags: ["Scripts"],
      method: "POST",
    })
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        content: z.string(),
        language: z.enum(["bash", "python"]).default("bash"),
      })
    )
    .output(scriptSchema.nullable())
    .handler(async ({ input }) => {
      const script = await scriptsHandler.create(input)
      return script ?? null
    }),

  list: protectedProcedure
    .route({
      summary: "List scripts",
      description: "Returns every stored bash script.",
      tags: ["Scripts"],
      method: "GET",
    })
    .output(z.array(scriptSchema))
    .handler(async () => {
      const scripts = await scriptsHandler.list()
      return scripts ?? []
    }),

  get: protectedProcedure
    .route({
      summary: "Get a script",
      description:
        "Returns a single bash script by id, or null when no row matches.",
      tags: ["Scripts"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .output(scriptSchema.nullable())
    .handler(async ({ input }) => {
      const script = await scriptsHandler.get(input.id)
      return script ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a script",
      description:
        "Replaces the name, description, and shell content of an existing script.",
      tags: ["Scripts"],
      method: "PUT",
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        content: z.string(),
        language: z.enum(["bash", "python"]).default("bash"),
      })
    )
    .output(scriptSchema.nullable())
    .handler(async ({ input }) => {
      const script = await scriptsHandler.update(input.id, input)
      return script ?? null
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a script",
      description:
        "Deletes a bash script by id. Returns the deleted row, or null.",
      tags: ["Scripts"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .output(scriptSchema.nullable())
    .handler(async ({ input }) => {
      const script = await scriptsHandler.delete(input.id)
      return script ?? null
    }),
}
