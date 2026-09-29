import { db } from "@playbook-runner/db"
import {
  inventoryDeviceGroups,
  inventoryDevices,
  inventoryGroups,
} from "@playbook-runner/db/schema/inventory"
import { and, asc, eq } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { inventoryInput } from "#v1/inventory/input"

type GroupsInput = typeof inventoryInput.groups
type DevicesInput = typeof inventoryInput.devices
type DeviceGroupsInput = typeof inventoryInput.deviceGroups

function found<T>(row: T | undefined): T {
  if (!row) throw errors.NOT_FOUND()
  return row
}

function inserted<T>(row: T | undefined): T {
  if (!row) throw errors.INTERNAL_SERVER_ERROR()
  return row
}

export const inventoryGroupHandler = {
  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<GroupsInput["create"]>
  }) => {
    const [row] = await db.insert(inventoryGroups).values(input).returning()
    return inserted(row)
  },

  list: async (_: { context: Context }) =>
    db.select().from(inventoryGroups).orderBy(asc(inventoryGroups.createdAt)),

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<GroupsInput["get"]>
  }) => {
    const [row] = await db
      .select()
      .from(inventoryGroups)
      .where(eq(inventoryGroups.id, input.id))
    return found(row)
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<GroupsInput["update"]>
  }) => {
    const { id, ...data } = input
    const [row] = await db
      .update(inventoryGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryGroups.id, id))
      .returning()
    return found(row)
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<GroupsInput["delete"]>
  }) => {
    const [row] = await db
      .delete(inventoryGroups)
      .where(eq(inventoryGroups.id, input.id))
      .returning()
    return found(row)
  },
}

export const inventoryDeviceHandler = {
  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<DevicesInput["create"]>
  }) => {
    const [row] = await db.insert(inventoryDevices).values(input).returning()
    return inserted(row)
  },

  list: async (_: { context: Context }) =>
    db.select().from(inventoryDevices).orderBy(asc(inventoryDevices.ipAddress)),

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<DevicesInput["get"]>
  }) => {
    const [row] = await db
      .select()
      .from(inventoryDevices)
      .where(eq(inventoryDevices.id, input.id))
    return found(row)
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<DevicesInput["update"]>
  }) => {
    const { id, ...data } = input
    const [row] = await db
      .update(inventoryDevices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryDevices.id, id))
      .returning()
    return found(row)
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<DevicesInput["delete"]>
  }) => {
    const [row] = await db
      .delete(inventoryDevices)
      .where(eq(inventoryDevices.id, input.id))
      .returning()
    return found(row)
  },
}

export const inventoryDeviceGroupHandler = {
  assign: async ({
    input,
  }: {
    context: Context
    input: z.infer<DeviceGroupsInput["assign"]>
  }) => {
    const [row] = await db
      .insert(inventoryDeviceGroups)
      .values(input)
      .returning()
    return inserted(row)
  },

  list: async (_: { context: Context }) =>
    db
      .select()
      .from(inventoryDeviceGroups)
      .orderBy(asc(inventoryDeviceGroups.createdAt)),

  listByDevice: async ({
    input,
  }: {
    context: Context
    input: z.infer<DeviceGroupsInput["listByDevice"]>
  }) =>
    db
      .select()
      .from(inventoryDeviceGroups)
      .where(eq(inventoryDeviceGroups.deviceId, input.deviceId)),

  listByGroup: async ({
    input,
  }: {
    context: Context
    input: z.infer<DeviceGroupsInput["listByGroup"]>
  }) =>
    db
      .select()
      .from(inventoryDeviceGroups)
      .where(eq(inventoryDeviceGroups.groupId, input.groupId)),

  unassign: async ({
    input,
  }: {
    context: Context
    input: z.infer<DeviceGroupsInput["unassign"]>
  }) => {
    const [row] = await db
      .delete(inventoryDeviceGroups)
      .where(
        and(
          eq(inventoryDeviceGroups.deviceId, input.deviceId),
          eq(inventoryDeviceGroups.groupId, input.groupId)
        )
      )
      .returning()
    return found(row)
  },
}
