import z from "zod"
import { protectedProcedure } from "#index"
import { configHandler } from "#v1/api-key/handler"
import { apiKeyInput } from "#v1/api-key/input"
import { apiKeyOutput } from "#v1/api-key/output"

const apiKeysRouter = {
  list: protectedProcedure
    .route({
      summary: "List API keys",
      description:
        "Lists all API keys owned by the authenticated user. The full key value is never returned; only metadata. Inherits UNAUTHORIZED / FORBIDDEN / INTERNAL_SERVER_ERROR from `protectedProcedure`.",
      tags: ["Config"],
      method: "GET",
    })
    .output(apiKeyOutput.list)
    .handler(async ({ context }) => {
      return z
        .array(apiKeyOutput.list.element)
        .parse(await configHandler.listApiKeys({ context }))
    }),

  create: protectedProcedure
    .route({
      summary: "Create an API key",
      description:
        "Creates a new API key for the authenticated user. Returns the full key value once — store it safely, it won't be shown again.",
      tags: ["Config"],
      method: "POST",
    })
    .input(apiKeyInput.create)
    .output(apiKeyOutput.create)
    .errors({
      BAD_REQUEST: {
        message: "Invalid input — name/expiresIn out of range",
        status: 400,
      },
    })
    .handler(async ({ context, input }) => {
      return apiKeyOutput.create.parse(
        await configHandler.createApiKey({ context, input })
      )
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete an API key",
      description: "Deletes an API key by id for the authenticated user.",
      tags: ["Config"],
      method: "DELETE",
    })
    .input(apiKeyInput.remove)
    .output(apiKeyOutput.remove)
    .errors({
      NOT_FOUND: {
        message: "API key not found",
        status: 404,
      },
    })
    .handler(async ({ context, input }) => {
      return configHandler.deleteApiKey({ context, input })
    }),
}

export const apiKeyRouter = {
  apiKeys: apiKeysRouter,
}
