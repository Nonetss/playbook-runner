import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins"
import type { Context } from "@playbook-runner/api/context"

/**
 * Requires the `x-csrf-token: orpc` header on cookie-authenticated calls.
 * API-key and bearer clients carry no ambient credentials, so they are exempt.
 */
export function csrfPlugin() {
  return new SimpleCsrfProtectionHandlerPlugin<Context>({
    exclude: ({ context }) =>
      context.headers.has("x-api-key") || context.headers.has("authorization"),
  })
}
