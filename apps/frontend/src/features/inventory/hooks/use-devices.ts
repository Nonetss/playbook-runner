import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type {
  InventoryDevice,
  InventoryDeviceList,
} from "@/features/inventory/types"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

export const useDevicesList = () => {
  return useHydratedQuery(orpc.inventory.devices.list.queryOptions())
}

export const useDeviceGet = (id: string, options?: { enabled?: boolean }) => {
  return useHydratedQuery(
    orpc.inventory.devices.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

const listKey = orpc.inventory.devices.list.queryKey()

type DeviceMutationInput = {
  name: string
  description?: string
  ipAddress: string
  portSSH?: number
  credentialId?: string | null
}

function applyCreateOptimistic(
  current: InventoryDeviceList | undefined,
  input: DeviceMutationInput
) {
  if (!current) return current
  const optimistic = {
    id: `__optimistic_${Date.now()}`,
    name: input.name,
    description: input.description ?? null,
    ipAddress: input.ipAddress,
    portSSH: input.portSSH ?? 22,
    credentialId: input.credentialId ?? null,
  } as unknown as InventoryDevice
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: InventoryDeviceList | undefined,
  input: { id: string } & DeviceMutationInput
) {
  if (!current) return current
  return current.map((device) =>
    device.id === input.id
      ? {
          ...device,
          name: input.name,
          description: input.description ?? device.description ?? null,
          ipAddress: input.ipAddress,
          portSSH: input.portSSH ?? device.portSSH ?? 22,
          credentialId:
            input.credentialId !== undefined
              ? input.credentialId
              : device.credentialId,
        }
      : device
  )
}

function applyDeleteOptimistic(
  current: InventoryDeviceList | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((device) => device.id !== input.id)
}

export const useDeviceCreate = () => {
  const { t } = useTranslation("inventory")
  return useResourceMutation<
    DeviceMutationInput,
    InventoryDevice,
    InventoryDeviceList
  >({
    mutationFn: (input) =>
      orpc.inventory.devices.create.call(input) as Promise<InventoryDevice>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: t("toast.device_created"),
      error: t("toast.device_create_error"),
    },
  })
}

export const useDeviceUpdate = () => {
  const { t } = useTranslation("inventory")
  return useResourceMutation<
    { id: string } & DeviceMutationInput,
    InventoryDevice,
    InventoryDeviceList
  >({
    mutationFn: (input) =>
      orpc.inventory.devices.update.call(input) as Promise<InventoryDevice>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: t("toast.device_updated"),
      error: t("toast.device_update_error"),
    },
  })
}

export const useDeviceDelete = () => {
  const { t } = useTranslation("inventory")
  return useResourceMutation<
    { id: string },
    InventoryDevice,
    InventoryDeviceList
  >({
    mutationFn: (input) =>
      orpc.inventory.devices.delete.call(input) as Promise<InventoryDevice>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: t("toast.device_deleted"),
      error: t("toast.device_delete_error"),
    },
  })
}

/**
 * Plain mutation hook kept for relations and other actions that don't touch
 * the device list directly. Caller is responsible for toasts.
 */
export function useDeviceAssign() {
  return useMutation(orpc.inventory.deviceGroups.assign.mutationOptions())
}

export function useDeviceUnassign() {
  return useMutation(orpc.inventory.deviceGroups.unassign.mutationOptions())
}
