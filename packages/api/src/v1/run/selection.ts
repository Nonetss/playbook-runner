import { z } from "zod"
import { idSchema } from "#v1/schemas"

/**
 * One inventory selection entry: a group, a device, or the built-in All
 * group (every device, resolved at run time, so it carries no id). `id`
 * lets job reads keep the looser stored shape while inputs require uuids.
 */
export function inventorySelectionItem<T extends z.ZodType<string>>(id: T) {
  return z.discriminatedUnion("type", [
    z.object({ type: z.literal("group"), id }),
    z.object({ type: z.literal("device"), id }),
    z.object({ type: z.literal("all") }),
  ])
}

export const inventorySelection = inventorySelectionItem(idSchema)

export type RunInventorySelection = z.infer<typeof inventorySelection>

/** Split a selection into the All flag and the explicit device/group ids. */
export function splitSelection(inventory: readonly RunInventorySelection[]) {
  const deviceIds: string[] = []
  const groupIds: string[] = []
  let all = false
  for (const sel of inventory) {
    if (sel.type === "all") all = true
    else if (sel.type === "device") deviceIds.push(sel.id)
    else groupIds.push(sel.id)
  }
  return { all, deviceIds, groupIds }
}
