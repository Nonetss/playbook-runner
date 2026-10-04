import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { makeAllGroup } from "@/features/inventory/all-group"
import type { InventoryGroup } from "@/features/inventory/types"

/**
 * Groups offered by inventory pickers: the built-in All group first (only
 * when there is at least one device to target), then the stored groups.
 */
export function useSelectableGroups(
  groups: readonly InventoryGroup[],
  devices: readonly unknown[]
): InventoryGroup[] {
  const { t } = useTranslation("inventory")
  const hasDevices = devices.length > 0
  return useMemo(
    () =>
      hasDevices
        ? [makeAllGroup(t("all_group.description")), ...groups]
        : [...groups],
    [groups, hasDevices, t]
  )
}
