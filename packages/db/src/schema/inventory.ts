import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const inventoryGroups = pgTable("inventory_groups", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type InventoryGroup = typeof inventoryGroups.$inferSelect
export type NewInventoryGroup = typeof inventoryGroups.$inferInsert

export const inventoryDevices = pgTable("inventory_devices", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type InventoryDevice = typeof inventoryDevices.$inferSelect
export type NewInventoryDevice = typeof inventoryDevices.$inferInsert

export const inventoryDeviceGroups = pgTable("inventory_device_groups", {
  id: uuid().defaultRandom().primaryKey(),
  deviceId: uuid("device_id"),
  groupId: uuid("group_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type InventoryDeviceGroup = typeof inventoryDeviceGroups.$inferSelect
export type NewInventoryDeviceGroup = typeof inventoryDeviceGroups.$inferInsert
