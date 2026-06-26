import { PUBLIC_SERVER_URL } from "astro:env/client"
import type { AppRouterClient } from "@none.stack/api/routers/index"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"

export const link = new RPCLink({
  url: `${PUBLIC_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    })
  },
})

export const orpc: AppRouterClient = createORPCClient(link)
