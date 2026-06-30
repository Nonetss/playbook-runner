import type { AppRouterClient } from "@none.stack/api/routers/index"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

export const link = new RPCLink({
  // Resolved lazily per request so it always targets the current browser
  // origin (avoids touching `window` during SSR). Caddy (prod) / Vite (dev)
  // proxy `/rpc` to the backend, keeping every call same-origin and CORS-free.
  url: () => `${window.location.origin}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    })
  },
})

/** Plain oRPC client for direct, imperative calls. */
export const client: AppRouterClient = createORPCClient(link)

/**
 * TanStack Query utils generated from the oRPC router. Use in components via
 * `useQuery(orpc.someProcedure.queryOptions())` /
 * `useMutation(orpc.someProcedure.mutationOptions())`.
 */
export const orpc = createTanstackQueryUtils(client)
