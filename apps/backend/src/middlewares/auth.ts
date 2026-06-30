import { auth } from "@playbook-runner/auth"
import { createMiddleware } from "hono/factory"

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}

export const sessionMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })
    c.set("user", session?.user ?? null)
    c.set("session", session?.session ?? null)
    await next()
  }
)

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get("user")
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401)
    }
    await next()
  }
)
