import z from "zod"
import { credentialsHandler } from "@/handlers/credentials"
import { protectedProcedure } from "@/index"

export const credentialsRouter = {
  create: protectedProcedure
    .route({
      summary: "Create a credential",
      description: "Creates a new credential for the authenticated user.",
      tags: ["Credentials"],
      method: "POST",
    })
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        privateKey: z.string(),
        publicKey: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.create(input)
      return credential ?? null
    }),

  list: protectedProcedure
    .route({
      summary: "List credentials",
      description: "Lists all credentials for the authenticated user.",
      tags: ["Credentials"],
      method: "GET",
    })
    .handler(async () => {
      const credentials = await credentialsHandler.list()
      return credentials ?? []
    }),

  get: protectedProcedure
    .route({
      summary: "Get a credential",
      description: "Gets a credential by ID for the authenticated user.",
      tags: ["Credentials"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.get(input.id)
      return credential ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a credential",
      description: "Updates a credential by ID for the authenticated user.",
      tags: ["Credentials"],
      method: "PUT",
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        privateKey: z.string(),
        publicKey: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.update(input.id, input)
      return credential ?? null
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a credential",
      description: "Deletes a credential by ID for the authenticated user.",
      tags: ["Credentials"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.delete(input.id)
      return credential ?? null
    }),
}
