import type { RouterClient } from "@orpc/server"

import { appRouter as v1Router } from "#routers/index"

/** The public, versioned API contract. */
export const appRouter = {
  v1: v1Router,
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
