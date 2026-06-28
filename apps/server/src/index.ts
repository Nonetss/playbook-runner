import { env } from "@none.stack/env/server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { type AuthVariables, sessionMiddleware } from "@/middlewares/auth"
import authRouter from "@/routers/auth"
import docsRouter from "@/routers/docs"
import rpcRouter from "@/routers/rpc"

const app = new Hono<{ Variables: AuthVariables }>()

app.use(logger())
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)
app.use("/*", sessionMiddleware)

app.route("/", authRouter)
app.route("/", rpcRouter)
app.route("/", docsRouter)

app.get("/", (c) => c.text("OK"))

export default app
