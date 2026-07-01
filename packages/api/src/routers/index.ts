import type { RouterClient } from "@orpc/server"
import { protectedProcedure, publicProcedure } from "@/index"
import { configRouter } from "@/routers/config"
import { credentialsRouter } from "@/routers/credentials"
import { inventoryRouter } from "@/routers/inventory"
import { jobsRouter } from "@/routers/jobs"
import { playbooksRouter } from "@/routers/playbooks"
import { runRouter } from "@/routers/run"

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

  config: configRouter,
  credentials: credentialsRouter,
  inventory: inventoryRouter,
  jobs: jobsRouter,
  playbooks: playbooksRouter,
  run: runRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
