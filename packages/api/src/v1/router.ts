import type { RouterClient } from "@orpc/server"
import { apiKeyRouter } from "#v1/api-key/router"
import { credentialsRouter } from "#v1/credentials/router"
import { grpcDemoRouter } from "#v1/grpc-demo/router"
import { healthRouter } from "#v1/health/router"
import { inventoryRouter } from "#v1/inventory/router"
import { jobsRouter } from "#v1/jobs/router"
import { playbooksRouter } from "#v1/playbooks/router"
import { privateRouter } from "#v1/private/router"
import { runRouter } from "#v1/run/router"
import { scriptsRouter } from "#v1/scripts/router"

export const appRouter = {
  health: healthRouter,
  private: privateRouter,
  config: apiKeyRouter,
  credentials: credentialsRouter,
  grpcDemo: grpcDemoRouter,
  inventory: inventoryRouter,
  jobs: jobsRouter,
  playbooks: playbooksRouter,
  scripts: scriptsRouter,
  run: runRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
