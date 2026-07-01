import { auth } from "@playbook-runner/auth"
import z from "zod"
import { protectedProcedure } from "@/index"

const apiKeyListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  start: z.string().nullable(),
  prefix: z.string().nullable(),
  enabled: z.boolean(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})

const apiKeySchema = apiKeyListItemSchema.extend({
  key: z.string(),
})

export type ApiKeyListItem = z.infer<typeof apiKeyListItemSchema>
export type ApiKey = z.infer<typeof apiKeySchema>

const apiKeysRouter = {
  list: protectedProcedure
    .route({
      summary: "List API keys",
      description:
        "Lists all API keys owned by the authenticated user. The full key value is never returned.",
      tags: ["Config"],
      method: "GET",
    })
    .handler(async ({ context }) => {
      const result = await auth.api.listApiKeys({
        headers: context.headers,
      })
      const items = result?.apiKeys ?? []
      return z.array(apiKeyListItemSchema).parse(items)
    }),

  create: protectedProcedure
    .route({
      summary: "Create an API key",
      description:
        "Creates a new API key for the authenticated user. Returns the full key value once — store it safely, it won't be shown again.",
      tags: ["Config"],
      method: "POST",
    })
    .input(
      z.object({
        name: z.string().min(1).max(64).optional(),
        expiresIn: z
          .number()
          .int()
          .min(60 * 60)
          .max(60 * 60 * 24 * 365)
          .optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const result = await auth.api.createApiKey({
        headers: context.headers,
        body: {
          configId: "default",
          name: input.name,
          ...(input.expiresIn ? { expiresIn: input.expiresIn } : {}),
        },
      })
      const apiKey = apiKeySchema.parse(result)
      return apiKey
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete an API key",
      description: "Deletes an API key by ID for the authenticated user.",
      tags: ["Config"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const result = await auth.api.deleteApiKey({
        headers: context.headers,
        body: { keyId: input.id },
      })
      return { id: input.id, success: !!result?.success }
    }),
}

export const configRouter = {
  apiKeys: apiKeysRouter,
}
