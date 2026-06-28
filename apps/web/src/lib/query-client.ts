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
 * Returns a singleton QueryClient on the browser so that separate Astro
 * islands rendered on the same page share one cache. On the server a fresh
 * client is created per request.
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
