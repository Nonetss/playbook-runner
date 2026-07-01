import { useMutation } from "@tanstack/react-query"
import type {
  InventoryGroup,
  InventoryGroupList,
} from "@/components/features/inventory/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export const useGroupsList = () => {
  return useHydratedQuery(orpc.inventory.groups.list.queryOptions())
}

export const useGroupGet = (id: string, options?: { enabled?: boolean }) => {
  return useHydratedQuery(
    orpc.inventory.groups.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

const listKey = orpc.inventory.groups.list.queryKey()

function applyCreateOptimistic(
  current: InventoryGroupList | undefined,
  input: { name: string; description?: string }
) {
  if (!current) return current
  const optimistic = {
    id: `__optimistic_${Date.now()}`,
    name: input.name,
    description: input.description ?? null,
  } as unknown as InventoryGroup
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: InventoryGroupList | undefined,
  input: { id: string; name: string; description?: string }
) {
  if (!current) return current
  return current.map((group) =>
    group.id === input.id
      ? {
          ...group,
          name: input.name,
          description: input.description ?? group.description ?? null,
        }
      : group
  )
}

function applyDeleteOptimistic(
  current: InventoryGroupList | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((group) => group.id !== input.id)
}

export const useGroupCreate = () =>
  useResourceMutation<
    { name: string; description?: string },
    InventoryGroup,
    InventoryGroupList
  >({
    mutationFn: (input) =>
      orpc.inventory.groups.create.call(input) as Promise<InventoryGroup>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: "Grupo creado",
      error: "No se pudo crear el grupo",
    },
  })

export const useGroupUpdate = () =>
  useResourceMutation<
    { id: string; name: string; description?: string },
    InventoryGroup,
    InventoryGroupList
  >({
    mutationFn: (input) =>
      orpc.inventory.groups.update.call(input) as Promise<InventoryGroup>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: "Grupo actualizado",
      error: "No se pudo actualizar el grupo",
    },
  })

export const useGroupDelete = () =>
  useResourceMutation<{ id: string }, InventoryGroup, InventoryGroupList>({
    mutationFn: (input) =>
      orpc.inventory.groups.delete.call(input) as Promise<InventoryGroup>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Grupo eliminado",
      error: "No se pudo eliminar el grupo",
    },
  })

/** Plain mutations for relations; toasts handled in the relations dialog. */
export function useGroupRelations() {
  return {
    assign: useMutation(orpc.inventory.deviceGroups.assign.mutationOptions()),
    unassign: useMutation(
      orpc.inventory.deviceGroups.unassign.mutationOptions()
    ),
  }
}
