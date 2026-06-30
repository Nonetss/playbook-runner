import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

const useInvalidateCredentials = () => {
  const queryClient = useQueryClient()

  return {
    list: () =>
      queryClient.invalidateQueries({
        queryKey: orpc.credentials.list.queryKey(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: orpc.credentials.get.queryKey({ input: { id } }),
      }),
    all: (id?: string) => {
      queryClient.invalidateQueries({
        queryKey: orpc.credentials.list.queryKey(),
      })
      if (id) {
        queryClient.invalidateQueries({
          queryKey: orpc.credentials.get.queryKey({ input: { id } }),
        })
      }
    },
  }
}

export const useCredentialsList = () => {
  return useQuery(orpc.credentials.list.queryOptions())
}

export const useCredentialGet = (id: string) => {
  return useQuery(
    orpc.credentials.get.queryOptions({
      input: { id },
      enabled: !!id,
    })
  )
}

export const useCredentialCreate = () => {
  const invalidate = useInvalidateCredentials()

  return useMutation(
    orpc.credentials.create.mutationOptions({
      onSuccess: () => invalidate.list(),
    })
  )
}

export const useCredentialUpdate = () => {
  const invalidate = useInvalidateCredentials()

  return useMutation(
    orpc.credentials.update.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}

export const useCredentialDelete = () => {
  const invalidate = useInvalidateCredentials()

  return useMutation(
    orpc.credentials.delete.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}
