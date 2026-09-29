import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { notifyError, notifySuccess } from "@/lib/toast"

/**
 * Context returned from `onMutate`. Carries the snapshot of the list cache so
 * we can roll back on error.
 */
export interface ResourceMutationContext<TList> {
  previousList?: TList
}

/**
 * Resource mutation options.
 *
 * - `mutationFn`: the actual mutation function (e.g. `orpc.foo.create`).
 * - `listKey`: queryKey of the cached list whose contents we want to optimistically patch.
 * - `applyOptimistic`: optional callback that receives the current list and the
 *   mutation input and returns the next optimistic list. When omitted the
 *   mutation simply invalidates the list on settle.
 * - `extraInvalidate`: extra static query keys to invalidate after settle.
 * - `detailKey`: builds the single-item query key from the input (e.g.
 *   `orpc.scripts.get.queryKey({ input: { id } })`). Invalidated after settle
 *   so edit forms and detail pages never show stale data.
 * - `removeDetail`: for deletes — remove the detail query on success instead
 *   of invalidating it (a refetch would 404).
 * - `messages`: success / error messages for the toast notifications.
 */
export interface UseResourceMutationOptions<TInput, TOutput, TList> {
  mutationFn: (input: TInput) => Promise<TOutput>
  listKey: QueryKey
  applyOptimistic?: (
    currentList: TList | undefined,
    input: TInput
  ) => TList | undefined
  extraInvalidate?: ReadonlyArray<QueryKey>
  detailKey?: (input: TInput) => QueryKey
  removeDetail?: boolean
  messages: {
    success: string
    error: string
  }
}

/**
 * Standard resource mutation pattern shared by all CRUD hooks:
 *  - cancel in-flight queries for the list
 *  - snapshot the list and apply an optimistic update
 *  - rollback + error toast on failure
 *  - success toast on success
 *  - invalidate the list (and any extra keys) on settle
 *
 * Designed to be wrapped by per-resource hooks (`useDeviceCreate`, etc.) that
 * pass the right oRPC mutation fn and list key. Returns the underlying
 * `useMutation` result so callers can read `isPending`, `variables`, etc.
 */
export function useResourceMutation<TInput, TOutput, TList = unknown>(
  options: UseResourceMutationOptions<TInput, TOutput, TList>
) {
  const queryClient = useQueryClient()
  const {
    mutationFn,
    listKey,
    applyOptimistic,
    extraInvalidate,
    detailKey,
    removeDetail = false,
    messages,
  } = options

  return useMutation<TOutput, Error, TInput, ResourceMutationContext<TList>>({
    mutationFn,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousList = queryClient.getQueryData<TList>(listKey)

      if (applyOptimistic) {
        const nextList = applyOptimistic(previousList, input)
        if (nextList !== undefined) {
          queryClient.setQueryData<TList>(listKey, nextList)
        }
      }

      return { previousList }
    },
    onError: (error, _input, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData<TList>(listKey, context.previousList)
      }
      notifyError(messages.error, error.message)
    },
    onSuccess: (_output, input) => {
      if (detailKey && removeDetail) {
        queryClient.removeQueries({ queryKey: detailKey(input) })
      }
      notifySuccess(messages.success)
    },
    onSettled: (_output, _error, input) => {
      queryClient.invalidateQueries({ queryKey: listKey })
      if (detailKey && !removeDetail) {
        queryClient.invalidateQueries({ queryKey: detailKey(input) })
      }
      for (const key of extraInvalidate ?? []) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
