import { auth } from "@none.stack/auth"
import type { RouterClient } from "@orpc/server"
import { protectedProcedure, publicProcedure } from "@/index"
import { credentialsRouter } from "@/routers/credentials"

export const appRouter = {
  healthCheck: publicProcedure
    .route({
      summary: "Health check",
      description: "Returns OK when the server is up and reachable.",
      tags: ["System"],
    })
    .handler(() => {
      return "OK"
    }),
  createApiKey: protectedProcedure
    .route({
      summary: "Create an API key",
      description:
        "Creates a new API key for the authenticated user. The key is valid for 30 days. Requires an active session.",
      tags: ["API Keys"],
    })
    .handler(async ({ context }) => {
      return await auth.api.createApiKey({
        headers: context.headers,
        body: {
          configId: "default",
          name: "API Key",
          expiresIn: 3600 * 24 * 30,
        },
      })
    }),
  privateData: protectedProcedure
    .route({
      summary: "Get private data",
      description:
        "Returns the authenticated user along with a sample private message. Requires a session cookie, Bearer token, or an x-api-key header.",
      tags: ["User"],
    })
    .handler(({ context }) => {
      return {
        message: "This is private",
        user: context.user,
      }
    }),

  credentials: credentialsRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
