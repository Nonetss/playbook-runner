import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { db } from "@playbook-runner/db"
import { env } from "@playbook-runner/env/server"
import { logger } from "@playbook-runner/logger"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { startJobScheduler } from "#jobs/scheduler"
import { type AuthVariables, sessionMiddleware } from "#middlewares/auth"
import { requestLogger } from "#middlewares/request-logger"
import authRouter from "#routers/auth"
import docsRouter from "#routers/docs"
import rpcRouter from "#routers/rpc"
import { seed } from "#scripts/seed"

// Both dev (bun runs the source from apps/backend/src) and prod
// (tsdown bundle at apps/backend/dist) sit three directories below
// the repo root, and packages/db sits at <root>/packages/db, so
// ../../../packages/db/src/migrations resolves correctly in both.
const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/db/src/migrations"
)

async function bootstrap() {
  logger.info("applying Drizzle migrations…")
  await migrate(db, { migrationsFolder })
  logger.info("schema is up to date")

  await seed()

  // Kick off the in-process job scheduler (cron-driven playbook runs).
  startJobScheduler()
}

const app = new Hono<{ Variables: AuthVariables }>()

app.use(requestLogger)
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true,
  })
)
app.use("/*", sessionMiddleware)

app.route("/", authRouter)
app.route("/", rpcRouter)
app.route("/", docsRouter)

app.get("/", (c) => c.text("OK"))

bootstrap().catch((err) => {
  logger.error({ err }, "bootstrap failed")
  process.exit(1)
})

export default app
