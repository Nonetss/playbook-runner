import { apiKey } from "@better-auth/api-key"
import { createDb } from "@none.stack/db"
import * as schema from "@none.stack/db/schema/auth"
import { env } from "@none.stack/env/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, genericOAuth } from "better-auth/plugins"

export function createAuth() {
  const db = createDb()

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
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
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      admin(),
      apiKey({ enableSessionForAPIKeys: true }),
      genericOAuth({
        config: [
          {
            providerId: env.GENERIC_OAUTH_PROVIDER_ID ?? "",
            clientId: env.GENERIC_OAUTH_CLIENT_ID ?? "",
            clientSecret: env.GENERIC_OAUTH_CLIENT_SECRET ?? "",
            discoveryUrl: `${env.GENERIC_OAUTH_ISSUER}/.well-known/openid-configuration`,
            scopes: ["openid", "profile", "email"],
          },
        ],
      }),
    ],
  })
}

export const auth = createAuth()
