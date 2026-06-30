import type { AppRouterClient } from "@none.stack/api/routers/index"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

export const link = new RPCLink({
  url: "/rpc",
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
