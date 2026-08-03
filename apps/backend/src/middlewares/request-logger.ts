import { logger } from "@playbook-runner/logger"
import { createMiddleware } from "hono/factory"
import type { AuthVariables } from "#middlewares/auth"

function levelForStatus(status: number) {
  if (status >= 500) return "error" as const
  if (status >= 400) return "warn" as const
  return "info" as const
}

export const requestLogger = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const start = performance.now()
    await next()
    const status = c.res.status
    const latencyMs = Math.round((performance.now() - start) * 100) / 100
    const user = c.get("user")
    logger[levelForStatus(status)](
      {
        method: c.req.method,
        path: c.req.path,
        status,
        latencyMs,
        ...(user ? { userId: user.id, userEmail: user.email } : {}),
      },
      "request"
    )
  }
)
