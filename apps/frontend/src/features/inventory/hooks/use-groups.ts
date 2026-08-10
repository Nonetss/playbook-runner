import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type {
  InventoryGroup,
  InventoryGroupList,
} from "@/features/inventory/types"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
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

export const useGroupCreate = () => {
  const { t } = useTranslation("inventory")
  return useResourceMutation<
    { name: string; description?: string },
    InventoryGroup,
    InventoryGroupList
  >({
    mutationFn: (input) =>
      orpc.inventory.groups.create.call(input) as Promise<InventoryGroup>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: t("toast.group_created"),
      error: t("toast.group_create_error"),
    },
  })
}

export const useGroupUpdate = () => {
  const { t } = useTranslation("inventory")
  return useResourceMutation<
    { id: string; name: string; description?: string },
    InventoryGroup,
    InventoryGroupList
  >({
    mutationFn: (input) =>
      orpc.inventory.groups.update.call(input) as Promise<InventoryGroup>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: t("toast.group_updated"),
      error: t("toast.group_update_error"),
    },
  })
}

export const useGroupDelete = () => {
  const { t } = useTranslation("inventory")
  return useResourceMutation<
    { id: string },
    InventoryGroup,
    InventoryGroupList
  >({
    mutationFn: (input) =>
      orpc.inventory.groups.delete.call(input) as Promise<InventoryGroup>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: t("toast.group_deleted"),
      error: t("toast.group_delete_error"),
    },
  })
}

/** Plain mutations for relations; toasts handled in the relations dialog. */
export function useGroupRelations() {
  return {
    assign: useMutation(orpc.inventory.deviceGroups.assign.mutationOptions()),
    unassign: useMutation(
      orpc.inventory.deviceGroups.unassign.mutationOptions()
    ),
  }
}
