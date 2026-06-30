"use client"

import { useMutation } from "@tanstack/react-query"
import type {
  InventoryDevice,
  InventoryDeviceList,
} from "@/components/features/inventory/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
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

export const useDeviceCreate = () =>
  useResourceMutation<
    DeviceMutationInput,
    InventoryDevice,
    InventoryDeviceList
  >({
    mutationFn: (input) =>
      orpc.inventory.devices.create.call(input) as Promise<InventoryDevice>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: "Dispositivo creado",
      error: "No se pudo crear el dispositivo",
    },
  })

export const useDeviceUpdate = () =>
  useResourceMutation<
    { id: string } & DeviceMutationInput,
    InventoryDevice,
    InventoryDeviceList
  >({
    mutationFn: (input) =>
      orpc.inventory.devices.update.call(input) as Promise<InventoryDevice>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: "Dispositivo actualizado",
      error: "No se pudo actualizar el dispositivo",
    },
  })

export const useDeviceDelete = () =>
  useResourceMutation<{ id: string }, InventoryDevice, InventoryDeviceList>({
    mutationFn: (input) =>
      orpc.inventory.devices.delete.call(input) as Promise<InventoryDevice>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Dispositivo eliminado",
      error: "No se pudo eliminar el dispositivo",
    },
  })

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
