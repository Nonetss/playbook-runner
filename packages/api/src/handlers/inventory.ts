import { db } from "@playbook-runner/db"
import {
  inventoryDeviceGroups,
  inventoryDevices,
  inventoryGroups,
  type NewInventoryDevice,
  type NewInventoryDeviceGroup,
  type NewInventoryGroup,
} from "@playbook-runner/db/schema/inventory"
import { and, asc, eq } from "drizzle-orm"

export const inventoryGroupHandler = {
  createGroup: async (group: NewInventoryGroup) => {
    const g = await db.insert(inventoryGroups).values(group).returning()
    return g[0] ?? null
  },

  listGroups: async () => {
    const g = await db
      .select()
      .from(inventoryGroups)
      .orderBy(asc(inventoryGroups.createdAt))
    return g
  },

  getGroup: async (id: string) => {
    const g = await db
      .select()
      .from(inventoryGroups)
      .where(eq(inventoryGroups.id, id))
    return g[0] ?? null
  },

  updateGroup: async (id: string, group: NewInventoryGroup) => {
    const g = await db
      .update(inventoryGroups)
      .set(group)
      .where(eq(inventoryGroups.id, id))
      .returning()
    return g[0] ?? null
  },

  deleteGroup: async (id: string) => {
    const g = await db
      .delete(inventoryGroups)
      .where(eq(inventoryGroups.id, id))
      .returning()
    return g[0] ?? null
  },
}

export const inventoryDeviceHandler = {
  createDevice: async (device: NewInventoryDevice) => {
    const d = await db.insert(inventoryDevices).values(device).returning()
    return d[0] ?? null
  },

  listDevices: async () => {
    const d = await db
      .select()
      .from(inventoryDevices)
      .orderBy(asc(inventoryDevices.createdAt))
    return d
  },

  getDevice: async (id: string) => {
    const d = await db
      .select()
      .from(inventoryDevices)
      .where(eq(inventoryDevices.id, id))
    return d[0] ?? null
  },

  updateDevice: async (id: string, device: NewInventoryDevice) => {
    const d = await db
      .update(inventoryDevices)
      .set(device)
      .where(eq(inventoryDevices.id, id))
      .returning()
    return d[0] ?? null
  },

  deleteDevice: async (id: string) => {
    const d = await db
      .delete(inventoryDevices)
      .where(eq(inventoryDevices.id, id))
      .returning()
    return d[0] ?? null
  },
}

export const inventoryDeviceGroupHandler = {
  assign: async (relation: NewInventoryDeviceGroup) => {
    const r = await db
      .insert(inventoryDeviceGroups)
      .values(relation)
      .returning()
    return r[0] ?? null
  },

  list: async () => {
    const r = await db
      .select()
      .from(inventoryDeviceGroups)
      .orderBy(asc(inventoryDeviceGroups.createdAt))
    return r
  },

  listByDevice: async (deviceId: string) => {
    const r = await db
      .select()
      .from(inventoryDeviceGroups)
      .where(eq(inventoryDeviceGroups.deviceId, deviceId))
    return r
  },

  listByGroup: async (groupId: string) => {
    const r = await db
      .select()
      .from(inventoryDeviceGroups)
      .where(eq(inventoryDeviceGroups.groupId, groupId))
    return r
  },

  unassign: async (deviceId: string, groupId: string) => {
    const r = await db
      .delete(inventoryDeviceGroups)
      .where(
        and(
          eq(inventoryDeviceGroups.deviceId, deviceId),
          eq(inventoryDeviceGroups.groupId, groupId)
        )
      )
      .returning()
    return r[0] ?? null
  },
}
