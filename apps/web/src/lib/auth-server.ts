import type { AstroGlobal } from "astro"
import { createAuthClient } from "better-auth/client"

export const authServer = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
})

export async function getSession(astro: AstroGlobal) {
  return authServer.getSession({
    fetchOptions: { headers: astro.request.headers },
  })
}
