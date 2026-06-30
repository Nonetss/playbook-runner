"use client"

import {
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query"
import { useHydrated } from "@/hooks/useHydrated"

/**
 * SSR-safe wrapper around `useQuery` for Astro `client:load` islands.
 *
 * Until hydration completes, cached data is ignored so the client matches the
 * server's pending state. After hydration, the shared browser QueryClient
 * cache is used immediately (no extra loading flash when data was prefetched).
 */
export function useHydratedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const hydrated = useHydrated()
  const query = useQuery({
    ...options,
    enabled: hydrated && (options.enabled ?? true),
  })

  if (!hydrated) {
    return {
      ...query,
      data: undefined,
      error: null,
      isError: false,
      isPending: true,
      isLoading: true,
      isFetching: false,
      isSuccess: false,
      status: "pending",
      fetchStatus: "idle",
    } as UseQueryResult<TData, TError>
  }

  return query
}
