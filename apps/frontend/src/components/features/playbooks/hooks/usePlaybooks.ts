import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

const useInvalidatePlaybooks = () => {
  const queryClient = useQueryClient()

  return {
    list: () =>
      queryClient.invalidateQueries({
        queryKey: orpc.playbooks.list.queryKey(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: orpc.playbooks.get.queryKey({ input: { id } }),
      }),
    all: (id?: string) => {
      queryClient.invalidateQueries({
        queryKey: orpc.playbooks.list.queryKey(),
      })
      if (id) {
        queryClient.invalidateQueries({
          queryKey: orpc.playbooks.get.queryKey({ input: { id } }),
        })
      }
    },
  }
}

export const usePlaybooksList = () => {
  return useQuery(orpc.playbooks.list.queryOptions())
}

export const usePlaybookGet = (id: string, options?: { enabled?: boolean }) => {
  return useQuery(
    orpc.playbooks.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

export const usePlaybookCreate = () => {
  const invalidate = useInvalidatePlaybooks()

  return useMutation(
    orpc.playbooks.create.mutationOptions({
      onSuccess: () => invalidate.list(),
    })
  )
}

export const usePlaybookUpdate = () => {
  const invalidate = useInvalidatePlaybooks()

  return useMutation(
    orpc.playbooks.update.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}

export const usePlaybookDelete = () => {
  const invalidate = useInvalidatePlaybooks()

  return useMutation(
    orpc.playbooks.delete.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}
