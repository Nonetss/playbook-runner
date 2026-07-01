import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ConfirmProvider } from "@/hooks/useConfirm"
import { getQueryClient } from "@/lib/query-client"

/**
 * Per-island providers.
 *
 * Astro renders every `client:*` component as an independent React root, so a
 * single provider in `Layout.astro` cannot supply context to sibling islands.
 * Instead each island that uses react-query / confirm wraps itself with
 * `AppProviders`. They all share the same QueryClient because `getQueryClient`
 * returns a browser singleton, so the cache is shared across islands and Astro
 * page swaps. List/detail hooks use `useHydratedQuery` so SSR markup matches
 * the first client paint even when that cache is already warm.
 *
 * The `<Toaster />` is NOT mounted here on purpose: sonner toasts are a global
 * store, so a single `<Toaster />` island is mounted once in `Layout.astro`.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>{children}</ConfirmProvider>
    </QueryClientProvider>
  )
}
