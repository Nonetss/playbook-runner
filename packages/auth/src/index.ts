import { apiKey } from "@better-auth/api-key"
import { createDb } from "@playbook-runner/db"
import * as schema from "@playbook-runner/db/schema/auth"
import { env } from "@playbook-runner/env/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { buildGenericOAuthPlugin, GENERIC_OAUTH_PROVIDER_ID } from "./oauth"

export function createAuth() {
  const db = createDb()

  const oauthPlugin = buildGenericOAuthPlugin()
  const oauthEnabled = oauthPlugin !== null

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
      // Closed team: accounts are created by admins (admin plugin) or SSO.
      disableSignUp: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: oauthEnabled ? [GENERIC_OAUTH_PROVIDER_ID] : [],
        // SSO corporativo es la fuente de verdad; no exigir emailVerified local previo.
        requireLocalEmailVerified: false,
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      admin(),
      apiKey({ enableSessionForAPIKeys: true }),
      ...(oauthPlugin ? [oauthPlugin] : []),
    ],
  })
}

export const auth = createAuth()

export { APIError } from "better-auth/api"
