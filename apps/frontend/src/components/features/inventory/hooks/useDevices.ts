import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

const useInvalidateDevices = () => {
  const queryClient = useQueryClient()

  return {
    list: () =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.devices.list.queryKey(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.devices.get.queryKey({ input: { id } }),
      }),
    all: (id?: string) => {
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.devices.list.queryKey(),
      })
      if (id) {
        queryClient.invalidateQueries({
          queryKey: orpc.inventory.devices.get.queryKey({ input: { id } }),
        })
      }
    },
  }
}

export const useDevicesList = () => {
  return useQuery(orpc.inventory.devices.list.queryOptions())
}

export const useDeviceGet = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery(
    orpc.inventory.devices.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

export const useDeviceCreate = () => {
  const invalidate = useInvalidateDevices()

  return useMutation(
    orpc.inventory.devices.create.mutationOptions({
      onSuccess: () => invalidate.list(),
    })
  )
}

export const useDeviceUpdate = () => {
  const invalidate = useInvalidateDevices()

  return useMutation(
    orpc.inventory.devices.update.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}

export const useDeviceDelete = () => {
  const invalidate = useInvalidateDevices()

  return useMutation(
    orpc.inventory.devices.delete.mutationOptions({
      onSuccess: (_, { id }) => invalidate.all(id),
    })
  )
}
