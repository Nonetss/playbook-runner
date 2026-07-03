import { z } from "zod"
import { playbooksHandler } from "#handlers/playbooks"
import { protectedProcedure } from "#index"

const playbookSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Playbook = z.infer<typeof playbookSchema>

export const playbooksRouter = {
  create: protectedProcedure
    .route({
      summary: "Create a playbook",
      description: "Persists a new playbook (name, description, YAML content).",
      tags: ["Playbooks"],
      method: "POST",
    })
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        content: z.string(),
      })
    )
    .output(playbookSchema.nullable())
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.create(input)
      return playbook ?? null
    }),

  list: protectedProcedure
    .route({
      summary: "List playbooks",
      description: "Returns every stored playbook, ordered by creation time.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .output(z.array(playbookSchema))
    .handler(async () => {
      const playbooks = await playbooksHandler.list()
      return playbooks ?? []
    }),

  get: protectedProcedure
    .route({
      summary: "Get a playbook",
      description:
        "Returns a single playbook by id, or null when no row matches.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .output(playbookSchema.nullable())
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.get(input.id)
      return playbook ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a playbook",
      description:
        "Replaces the name, description, and YAML content of an existing playbook.",
      tags: ["Playbooks"],
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
    .output(playbookSchema.nullable())
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.update(input.id, input)
      return playbook ?? null
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a playbook",
      description:
        "Deletes a playbook by id. Returns the deleted row, or null.",
      tags: ["Playbooks"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .output(playbookSchema.nullable())
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.delete(input.id)
      return playbook ?? null
    }),
}
