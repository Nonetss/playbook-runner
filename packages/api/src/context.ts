import type { auth } from "@playbook-runner/auth"
import type { Context as HonoContext } from "hono"

export type CreateContextOptions = {
  context: HonoContext
}

export async function createContext({ context }: CreateContextOptions) {
  const user = (context.get("user") ?? null) as
    | typeof auth.$Infer.Session.user
    | null
  const session = (context.get("session") ?? null) as
    | typeof auth.$Infer.Session.session
    | null

  return { user, session, headers: context.req.raw.headers }
}

export type Context = Awaited<ReturnType<typeof createContext>>
