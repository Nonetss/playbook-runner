import { z } from "zod"
import { playbooksHandler } from "@/handlers/playbooks"
import { protectedProcedure } from "@/index"

export const playbooksRouter = {
  create: protectedProcedure
    .route({
      summary: "Create a playbook",
      description: "Creates a new playbook.",
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
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.create(input)
      return playbook ?? null
    }),

  list: protectedProcedure
    .route({
      summary: "List playbooks",
      description: "Lists all playbooks.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .handler(async () => {
      const playbooks = await playbooksHandler.list()
      return playbooks ?? []
    }),

  get: protectedProcedure
    .route({
      summary: "Get a playbook",
      description: "Gets a playbook by ID.",
      tags: ["Playbooks"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.get(input.id)
      return playbook ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a playbook",
      description: "Updates a playbook by ID.",
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
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.update(input.id, input)
      return playbook ?? null
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a playbook",
      description: "Deletes a playbook by ID.",
      tags: ["Playbooks"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const playbook = await playbooksHandler.delete(input.id)
      return playbook ?? null
    }),
}
