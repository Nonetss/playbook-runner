import { PUBLIC_SERVER_URL } from "astro:env/client"
import { apiKeyClient } from "@better-auth/api-key/client"
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: PUBLIC_SERVER_URL,
  plugins: [apiKeyClient(), adminClient()],
})
