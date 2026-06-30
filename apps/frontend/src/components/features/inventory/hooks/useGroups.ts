import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

const useInvalidateGroups = () => {
  const queryClient = useQueryClient()

  return {
    list: () =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.groups.list.queryKey(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.groups.get.queryKey({ input: { id } }),
      }),
    all: (id?: string) => {
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.groups.list.queryKey(),
      })
      if (id) {
        queryClient.invalidateQueries({
          queryKey: orpc.inventory.groups.get.queryKey({ input: { id } }),
        })
      }
    },
  }
}

export const useGroupsList = () => {
  return useQuery(orpc.inventory.groups.list.queryOptions())
}

export const useGroupGet = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery(
    orpc.inventory.groups.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

export const useGroupCreate = () => {
  const invalidate = useInvalidateGroups()

  return useMutation(
    orpc.inventory.groups.create.mutationOptions({
      onSuccess: () => invalidate.list(),
    })
  )
}

export const useGroupUpdate = () => {
  const invalidate = useInvalidateGroups()

  return useMutation(
    orpc.inventory.groups.update.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}

export const useGroupDelete = () => {
  const invalidate = useInvalidateGroups()

  return useMutation(
    orpc.inventory.groups.delete.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}
