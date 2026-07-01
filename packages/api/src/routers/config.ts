import { auth } from "@playbook-runner/auth"
import z from "zod"
import { protectedProcedure } from "@/index"

// `list` returns every field except the secret. `create` includes the secret
// exactly once so the caller can store it.
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

const apiKeyDeleteResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
})

export type ApiKeyListItem = z.infer<typeof apiKeyListItemSchema>
export type ApiKey = z.infer<typeof apiKeySchema>

const apiKeysRouter = {
  list: protectedProcedure
    .route({
      summary: "List API keys",
      description:
        "Lists all API keys owned by the authenticated user. The full key value is never returned; only metadata. Inherits UNAUTHORIZED / FORBIDDEN / INTERNAL_SERVER_ERROR from `protectedProcedure`.",
      tags: ["Config"],
      method: "GET",
    })
    .output(z.array(apiKeyListItemSchema))
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
    .output(apiKeySchema)
    .errors({
      BAD_REQUEST: {
        message: "Invalid input — name/expiresIn out of range",
        status: 400,
      },
    })
    .handler(async ({ context, input }) => {
      const result = await auth.api.createApiKey({
        headers: context.headers,
        body: {
          configId: "default",
          name: input.name,
          ...(input.expiresIn ? { expiresIn: input.expiresIn } : {}),
        },
      })
      return apiKeySchema.parse(result)
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete an API key",
      description: "Deletes an API key by id for the authenticated user.",
      tags: ["Config"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .output(apiKeyDeleteResultSchema)
    .errors({
      NOT_FOUND: {
        message: "API key not found",
        status: 404,
      },
    })
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
