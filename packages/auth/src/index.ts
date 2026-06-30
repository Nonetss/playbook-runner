import { apiKey } from "@better-auth/api-key"
import { createDb } from "@playbook-runner/db"
import * as schema from "@playbook-runner/db/schema/auth"
import { env } from "@playbook-runner/env/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, genericOAuth } from "better-auth/plugins"

const GENERIC_OAUTH_PROVIDER_ID = "generic"

function buildGenericOAuthPlugin() {
  const { GENERIC_OAUTH_CLIENT_ID, GENERIC_OAUTH_CLIENT_SECRET, GENERIC_OAUTH_ISSUER } = env
  if (!GENERIC_OAUTH_CLIENT_ID || !GENERIC_OAUTH_CLIENT_SECRET || !GENERIC_OAUTH_ISSUER) {
    return null
  }
  return genericOAuth({
    config: [
      {
        providerId: GENERIC_OAUTH_PROVIDER_ID,
        clientId: GENERIC_OAUTH_CLIENT_ID,
        clientSecret: GENERIC_OAUTH_CLIENT_SECRET,
        discoveryUrl: `${GENERIC_OAUTH_ISSUER}/.well-known/openid-configuration`,
        scopes: ["openid", "profile", "email"],
      },
    ],
  })
}

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
        sameSite: "none",
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
