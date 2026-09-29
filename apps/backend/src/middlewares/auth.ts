import { APIError, auth } from "@playbook-runner/auth"
import { createMiddleware } from "hono/factory"

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}

export const sessionMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    // An invalid/expired `x-api-key` makes getSession throw; treat it as an
    // anonymous request so protected procedures answer 401 instead of 500.
    const session = await auth.api
      .getSession({ headers: c.req.raw.headers })
      .catch((error: unknown) => {
        if (error instanceof APIError) return null
        throw error
      })
    c.set("user", session?.user ?? null)
    c.set("session", session?.session ?? null)
    await next()
  }
)
