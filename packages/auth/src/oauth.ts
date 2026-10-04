import { env } from "@playbook-runner/env/server"
import { genericOAuth } from "better-auth/plugins"

export const GENERIC_OAUTH_PROVIDER_ID = "generic"

/** Whether the generic OIDC provider (`GENERIC_OAUTH_*`) is fully configured. */
export function isOidcConfigured() {
  const {
    GENERIC_OAUTH_CLIENT_ID,
    GENERIC_OAUTH_CLIENT_SECRET,
    GENERIC_OAUTH_ISSUER,
  } = env
  return Boolean(
    GENERIC_OAUTH_CLIENT_ID &&
      GENERIC_OAUTH_CLIENT_SECRET &&
      GENERIC_OAUTH_ISSUER
  )
}

export function buildGenericOAuthPlugin() {
  const {
    GENERIC_OAUTH_CLIENT_ID,
    GENERIC_OAUTH_CLIENT_SECRET,
    GENERIC_OAUTH_ISSUER,
  } = env
  if (
    !GENERIC_OAUTH_CLIENT_ID ||
    !GENERIC_OAUTH_CLIENT_SECRET ||
    !GENERIC_OAUTH_ISSUER
  ) {
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
