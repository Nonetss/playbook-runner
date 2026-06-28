import { apiKeyClient } from "@better-auth/api-key/client"
import type { AstroGlobal } from "astro"
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"

export const authServer = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [apiKeyClient(), adminClient()],
})

export async function getSession(astro: AstroGlobal) {
  return authServer.getSession({
    fetchOptions: { headers: astro.request.headers },
  })
}
