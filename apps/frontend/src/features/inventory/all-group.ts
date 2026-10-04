import type { InventoryGroup } from "@/features/inventory/types"

/**
 * The built-in All group is virtual: it has no database row and always
 * contains every device. Inside the UI it is a group whose id is this
 * sentinel; `toRunSelection` turns it into the API's `{ type: "all" }`.
 */
export const ALL_GROUP_ID = "all"

export function isAllGroup(id: string): boolean {
  return id === ALL_GROUP_ID
}

/** The All group shaped like a stored group, for lists and pickers. */
export function makeAllGroup(description: string): InventoryGroup {
  return {
    id: ALL_GROUP_ID,
    name: "All",
    description,
    createdAt: null,
    updatedAt: null,
  }
}
