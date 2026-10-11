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

/**
 * Devices reached through the selected groups, each mapped to the selected
 * groups that cover it (in `groups` order, so the first one names the hint).
 * The All group's sentinel covers every device. Relations to devices or
 * groups that are not listed are ignored.
 */
export function coveredDevices(
  selectedGroups: ReadonlySet<string>,
  groups: readonly { id: string }[],
  devices: readonly { id: string }[],
  relations: readonly { deviceId: string; groupId: string }[]
): Map<string, string[]> {
  const covered = new Map<string, string[]>()
  const selected = groups.filter((group) => selectedGroups.has(group.id))
  if (selected.length === 0) return covered

  const deviceIds = new Set(devices.map((device) => device.id))
  const members = new Map<string, Set<string>>()
  for (const { deviceId, groupId } of relations) {
    if (!deviceIds.has(deviceId)) continue
    let groupMembers = members.get(groupId)
    if (!groupMembers) {
      groupMembers = new Set()
      members.set(groupId, groupMembers)
    }
    groupMembers.add(deviceId)
  }

  for (const group of selected) {
    const groupMembers = isAllGroup(group.id)
      ? deviceIds
      : members.get(group.id)
    for (const deviceId of groupMembers ?? []) {
      const coveringGroups = covered.get(deviceId)
      if (coveringGroups) coveringGroups.push(group.id)
      else covered.set(deviceId, [group.id])
    }
  }
  return covered
}
