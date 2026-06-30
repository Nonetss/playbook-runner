import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const inventoryGroups = pgTable("inventory_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type InventoryGroup = typeof inventoryGroups.$inferSelect
export type NewInventoryGroup = typeof inventoryGroups.$inferInsert

export const inventoryDevices = pgTable("inventory_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ipAddress: text("ip_address").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type InventoryDevice = typeof inventoryDevices.$inferSelect
export type NewInventoryDevice = typeof inventoryDevices.$inferInsert

export const inventoryDeviceGroups = pgTable("inventory_device_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").references(() => inventoryDevices.id, {
    onDelete: "cascade",
  }),
  groupId: uuid("group_id").references(() => inventoryGroups.id, {
    onDelete: "cascade",
  }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type InventoryDeviceGroup = typeof inventoryDeviceGroups.$inferSelect
export type NewInventoryDeviceGroup = typeof inventoryDeviceGroups.$inferInsert
