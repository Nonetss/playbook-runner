import { PUBLIC_SERVER_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: PUBLIC_SERVER_URL,
});
