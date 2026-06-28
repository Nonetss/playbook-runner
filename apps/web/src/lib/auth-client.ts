import { PUBLIC_SERVER_URL } from "astro:env/client"
import { apiKeyClient } from "@better-auth/api-key/client"
import { adminClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: PUBLIC_SERVER_URL,
  plugins: [apiKeyClient(), adminClient()],
})
