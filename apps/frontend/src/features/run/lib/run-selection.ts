import { ALL_GROUP_ID, isAllGroup } from "@/features/inventory/all-group"
import type { RunSelection } from "@/features/run/types"

/**
 * Build the API selection from the picker's id sets. The All group's
 * sentinel id becomes `{ type: "all" }`.
 */
export function toRunSelection(
  groups: Iterable<string>,
  devices: Iterable<string>
): RunSelection[] {
  return [
    ...[...groups].map(
      (id): RunSelection =>
        isAllGroup(id) ? { type: "all" } : { id, type: "group" }
    ),
    ...[...devices].map((id): RunSelection => ({ id, type: "device" })),
  ]
}

/** Inverse of `toRunSelection`, e.g. to edit a stored job's inventory. */
export function fromRunSelection(
  items: readonly RunSelection[] | null | undefined
): { groups: Set<string>; devices: Set<string> } {
  const groups = new Set<string>()
  const devices = new Set<string>()
  for (const item of items ?? []) {
    if (item.type === "all") groups.add(ALL_GROUP_ID)
    else if (item.type === "group") groups.add(item.id)
    else devices.add(item.id)
  }
  return { groups, devices }
}
