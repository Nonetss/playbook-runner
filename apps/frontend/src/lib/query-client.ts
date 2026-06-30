import { QueryClient } from "@tanstack/react-query"

let browserQueryClient: QueryClient | undefined

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })
}

/**
 * Returns the **singleton** QueryClient on the browser so the cache persists
 * across Astro page swaps (`astro:transitions`) and between islands.
 *
 * On the server a fresh client is created per request to avoid leaking state
 * between SSR requests.
 *
 * Always pair this with `QueryClientProvider` rendered once at the app shell
 * (see `components/providers/app-providers.tsx`).
 */
export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
