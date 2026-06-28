import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { getQueryClient } from "@/lib/query-client"

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
