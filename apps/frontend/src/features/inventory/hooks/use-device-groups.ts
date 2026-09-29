import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
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
  return useHydratedQuery(orpc.inventory.deviceGroups.list.queryOptions())
}

export const useDeviceGroupsByDevice = (
  deviceId: string,
  options?: { enabled?: boolean }
) => {
  return useHydratedQuery(
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
  return useHydratedQuery(
    orpc.inventory.deviceGroups.listByGroup.queryOptions({
      input: { groupId },
      enabled: !!groupId && (options?.enabled ?? true),
    })
  )
}

type DeviceGroupInput = { deviceId: string; groupId: string }

export const useDeviceGroupAssign = () => {
  const { t } = useTranslation("inventory")
  const invalidate = useInvalidateDeviceGroups()

  return useOrpcMutation({
    mutationFn: (input: DeviceGroupInput) =>
      orpc.inventory.deviceGroups.assign.call(input),
    success: t("relations.created"),
    error: t("relations.create_error"),
    onSuccess: (_, { deviceId, groupId }) => invalidate.all(deviceId, groupId),
  })
}

export const useDeviceGroupUnassign = () => {
  const { t } = useTranslation("inventory")
  const invalidate = useInvalidateDeviceGroups()

  return useOrpcMutation({
    mutationFn: (input: DeviceGroupInput) =>
      orpc.inventory.deviceGroups.unassign.call(input),
    success: t("relations.removed"),
    error: t("relations.remove_error"),
    onSuccess: (_, { deviceId, groupId }) => invalidate.all(deviceId, groupId),
  })
}
