import type { RouterClient } from "@orpc/server"
import z from "zod"
import { protectedProcedure, publicProcedure } from "@/index"
import { configRouter } from "@/routers/config"
import { credentialsRouter } from "@/routers/credentials"
import { inventoryRouter } from "@/routers/inventory"
import { jobsRouter } from "@/routers/jobs"
import { playbooksRouter } from "@/routers/playbooks"
import { runRouter } from "@/routers/run"
import { scriptsRouter } from "@/routers/scripts"

// Response schemas for the root procedures.
const healthCheckOutputSchema = z.literal("OK")

const privateDataOutputSchema = z.object({
  message: z.string(),
  user: z.unknown(),
})

export const appRouter = {
  healthCheck: publicProcedure
    .route({
      summary: "Health check",
      description:
        "Returns OK when the server is up and reachable. Public endpoint.",
      tags: ["System"],
      method: "GET",
    })
    .output(healthCheckOutputSchema)
    .handler(() => {
      return "OK" as const
    }),
  privateData: protectedProcedure
    .route({
      summary: "Get private data",
      description:
        "Returns the authenticated user along with a sample private message. Requires a session cookie, Bearer token, or an x-api-key header (inherits UNAUTHORIZED / FORBIDDEN / INTERNAL_SERVER_ERROR from the base procedure).",
      tags: ["User"],
      method: "GET",
    })
    .output(privateDataOutputSchema)
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
  scripts: scriptsRouter,
  run: runRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
