import { BETTER_AUTH_URL } from "astro:env/server"
import type { AstroGlobal } from "astro"
import { createAuthClient } from "better-auth/client"

export const authServer = createAuthClient({
  baseURL: BETTER_AUTH_URL,
})

export async function getSession(astro: AstroGlobal) {
  return authServer.getSession({
    fetchOptions: { headers: astro.request.headers },
  })
}
