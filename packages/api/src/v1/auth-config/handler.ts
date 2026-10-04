import { isOidcConfigured } from "@playbook-runner/auth/oauth"
import type { Context } from "#context"

export const authConfigHandler = {
  get: async (_: { context: Context }) => ({ ssoEnabled: isOidcConfigured() }),
}
