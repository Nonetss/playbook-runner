import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

const useInvalidateDeviceGroups = () => {
  const queryClient = useQueryClient()

  return {
    list: () =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.deviceGroups.list.queryKey(),
      }),
    listByDevice: (deviceId: string) =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.deviceGroups.listByDevice.queryKey({
          input: { deviceId },
        }),
      }),
    listByGroup: (groupId: string) =>
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.deviceGroups.listByGroup.queryKey({
          input: { groupId },
        }),
      }),
    all: (deviceId?: string, groupId?: string) => {
      queryClient.invalidateQueries({
        queryKey: orpc.inventory.deviceGroups.list.queryKey(),
      })
      if (deviceId) {
        queryClient.invalidateQueries({
          queryKey: orpc.inventory.deviceGroups.listByDevice.queryKey({
            input: { deviceId },
          }),
        })
      }
      if (groupId) {
        queryClient.invalidateQueries({
          queryKey: orpc.inventory.deviceGroups.listByGroup.queryKey({
            input: { groupId },
          }),
        })
      }
    },
  }
}

export const useDeviceGroupsList = () => {
  return useQuery(orpc.inventory.deviceGroups.list.queryOptions())
}

export const useDeviceGroupsByDevice = (
  deviceId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery(
    orpc.inventory.deviceGroups.listByDevice.queryOptions({
      input: { deviceId },
      enabled: !!deviceId && (options?.enabled ?? true),
    })
  )
}

export const useDeviceGroupsByGroup = (
  groupId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery(
    orpc.inventory.deviceGroups.listByGroup.queryOptions({
      input: { groupId },
      enabled: !!groupId && (options?.enabled ?? true),
    })
  )
}

export const useDeviceGroupAssign = () => {
  const invalidate = useInvalidateDeviceGroups()

  return useMutation(
    orpc.inventory.deviceGroups.assign.mutationOptions({
      onSuccess: (_, { deviceId, groupId }) =>
        invalidate.all(deviceId, groupId),
    })
  )
}

export const useDeviceGroupUnassign = () => {
  const invalidate = useInvalidateDeviceGroups()

  return useMutation(
    orpc.inventory.deviceGroups.unassign.mutationOptions({
      onSuccess: (_, { deviceId, groupId }) =>
        invalidate.all(deviceId, groupId),
    })
  )
}
