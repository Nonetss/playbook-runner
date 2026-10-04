import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import type { AppRouterClient } from "@playbook-runner/api/router"

export const link = new RPCLink({
  // Resolved lazily per request so it always targets the current browser
  // origin (avoids touching `window` during SSR). The gateway (Docker) / Vite
  // (dev) proxy `/rpc` to the backend, keeping every call same-origin and
  // CORS-free.
  url: () => `${window.location.origin}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    })
  },
  // Sends `x-csrf-token: orpc`, required by the backend for cookie auth.
  plugins: [new SimpleCsrfProtectionLinkPlugin()],
})

/** Plain oRPC client for direct, imperative calls. */
export const client: AppRouterClient = createORPCClient(link)

/**
 * TanStack Query utils generated from the oRPC router. Use in components via
 * `useHydratedQuery(orpc.someProcedure.queryOptions())` /
 * `useMutation(orpc.someProcedure.mutationOptions())`.
 */
export const orpc = createTanstackQueryUtils(client.v1)
