import {
  type QueryKey,
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { notifyError, notifySuccess } from "@/lib/toast"

export interface OrpcMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>
  /**
   * Success toast title. Pass a function when the copy depends on the result
   * or the input. Omit to stay silent on success.
   */
  success?: string | ((data: TData, variables: TVariables) => string)
  /** Failure toast title; the thrown error's message becomes the description. */
  error: string
  /** Query key prefixes to invalidate once the mutation settles. */
  invalidate?: readonly QueryKey[]
  /** Extra work after a successful call, before invalidation. */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>
}

/**
 * The mutation shape most oRPC-backed writes want: call the procedure, toast
 * the outcome, invalidate what went stale.
 *
 * Use `useResourceMutation` instead when the list should also update
 * optimistically — this one only invalidates.
 */
export function useOrpcMutation<TData, TVariables = void>({
  mutationFn,
  success,
  error,
  invalidate,
  onSuccess,
}: OrpcMutationOptions<TData, TVariables>): UseMutationResult<
  TData,
  Error,
  TVariables
> {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: async (data, variables) => {
      if (success !== undefined) {
        notifySuccess(
          typeof success === "function" ? success(data, variables) : success
        )
      }
      await onSuccess?.(data, variables)
      await Promise.all(
        (invalidate ?? []).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      )
    },
    onError: (cause) => {
      notifyError(error, cause.message)
    },
  })
}
