import { auth } from "@none.stack/auth"
import type { RouterClient } from "@orpc/server"

import { protectedProcedure, publicProcedure } from "@/index"

export const appRouter = {
  createApiKey: protectedProcedure.handler(async ({ context }) => {
    return await auth.api.createApiKey({
      headers: context.headers,
      body: {
        configId: "default",
        name: "API Key",
        expiresIn: 3600 * 24 * 30,
      },
    })
  }),
  healthCheck: publicProcedure.handler(() => {
    return "OK"
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.user,
    }
  }),
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
