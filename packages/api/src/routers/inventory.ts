import z from "zod"
import {
  inventoryDeviceGroupHandler,
  inventoryDeviceHandler,
  inventoryGroupHandler,
} from "@/handlers/inventory"
import { protectedProcedure } from "@/index"

// Inputs
const uuidSchema = z.string().uuid()
const groupInput = z.object({
  name: z.string(),
  description: z.string().optional(),
})
const deviceInput = z.object({
  name: z.string(),
  description: z.string().optional(),
  ipAddress: z.string(),
  portSSH: z.number().int().min(1).max(65535).optional(),
  credentialId: uuidSchema.nullable().optional(),
})
const deviceGroupInput = z.object({
  deviceId: z.string(),
  groupId: z.string(),
})

// Response schemas — colocated so each handler and the `get`/`list` pair stay
// in lock-step.
const inventoryGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const inventoryDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ipAddress: z.string(),
  portSSH: z.number().int(),
  credentialId: uuidSchema.nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const inventoryDeviceGroupSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  groupId: z.string(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type InventoryGroup = z.infer<typeof inventoryGroupSchema>
export type InventoryDevice = z.infer<typeof inventoryDeviceSchema>
export type InventoryDeviceGroup = z.infer<typeof inventoryDeviceGroupSchema>

export const inventoryRouter = {
  groups: {
    create: protectedProcedure
      .route({
        summary: "Create an inventory group",
        description: "Persists a new inventory group.",
        tags: ["Inventory"],
        method: "POST",
      })
      .input(groupInput)
      .output(inventoryGroupSchema.nullable())
      .handler(async ({ input }) => {
        const group = await inventoryGroupHandler.createGroup(input)
        return group ?? null
      }),

    list: protectedProcedure
      .route({
        summary: "List inventory groups",
        description: "Returns every stored inventory group.",
        tags: ["Inventory"],
        method: "GET",
      })
      .output(z.array(inventoryGroupSchema))
      .handler(async () => {
        const groups = await inventoryGroupHandler.listGroups()
        return groups ?? []
      }),

    get: protectedProcedure
      .route({
        summary: "Get an inventory group",
        description:
          "Returns an inventory group by id, or null when no row matches.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ id: z.string() }))
      .output(inventoryGroupSchema.nullable())
      .handler(async ({ input }) => {
        const group = await inventoryGroupHandler.getGroup(input.id)
        return group ?? null
      }),

    update: protectedProcedure
      .route({
        summary: "Update an inventory group",
        description:
          "Replaces the name and description of an existing inventory group.",
        tags: ["Inventory"],
        method: "PUT",
      })
      .input(groupInput.extend({ id: z.string() }))
      .output(inventoryGroupSchema.nullable())
      .handler(async ({ input }) => {
        const { id, ...data } = input
        const group = await inventoryGroupHandler.updateGroup(id, data)
        return group ?? null
      }),

    delete: protectedProcedure
      .route({
        summary: "Delete an inventory group",
        description:
          "Deletes an inventory group by id. Returns the deleted row, or null.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(z.object({ id: z.string() }))
      .output(inventoryGroupSchema.nullable())
      .handler(async ({ input }) => {
        const group = await inventoryGroupHandler.deleteGroup(input.id)
        return group ?? null
      }),
  },

  devices: {
    create: protectedProcedure
      .route({
        summary: "Create an inventory device",
        description:
          "Persists a new inventory device and optionally links it to a stored credential.",
        tags: ["Inventory"],
        method: "POST",
      })
      .input(deviceInput)
      .output(inventoryDeviceSchema.nullable())
      .handler(async ({ input }) => {
        const device = await inventoryDeviceHandler.createDevice(input)
        return device ?? null
      }),

    list: protectedProcedure
      .route({
        summary: "List inventory devices",
        description: "Returns every stored inventory device.",
        tags: ["Inventory"],
        method: "GET",
      })
      .output(z.array(inventoryDeviceSchema))
      .handler(async () => {
        const devices = await inventoryDeviceHandler.listDevices()
        return devices ?? []
      }),

    get: protectedProcedure
      .route({
        summary: "Get an inventory device",
        description:
          "Returns an inventory device by id, or null when no row matches.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ id: z.string() }))
      .output(inventoryDeviceSchema.nullable())
      .handler(async ({ input }) => {
        const device = await inventoryDeviceHandler.getDevice(input.id)
        return device ?? null
      }),

    update: protectedProcedure
      .route({
        summary: "Update an inventory device",
        description:
          "Replaces all editable fields of an inventory device, including its credential link.",
        tags: ["Inventory"],
        method: "PUT",
      })
      .input(deviceInput.extend({ id: z.string() }))
      .output(inventoryDeviceSchema.nullable())
      .handler(async ({ input }) => {
        const { id, ...data } = input
        const device = await inventoryDeviceHandler.updateDevice(id, data)
        return device ?? null
      }),

    delete: protectedProcedure
      .route({
        summary: "Delete an inventory device",
        description:
          "Deletes an inventory device by id. Returns the deleted row, or null.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(z.object({ id: z.string() }))
      .output(inventoryDeviceSchema.nullable())
      .handler(async ({ input }) => {
        const device = await inventoryDeviceHandler.deleteDevice(input.id)
        return device ?? null
      }),
  },

  deviceGroups: {
    assign: protectedProcedure
      .route({
        summary: "Assign a device to a group",
        description:
          "Creates a relation between an inventory device and a group.",
        tags: ["Inventory"],
        method: "POST",
      })
      .input(deviceGroupInput)
      .output(inventoryDeviceGroupSchema.nullable())
      .handler(async ({ input }) => {
        const relation = await inventoryDeviceGroupHandler.assign(input)
        return relation ?? null
      }),

    list: protectedProcedure
      .route({
        summary: "List device-group relations",
        description: "Returns every device-group relation.",
        tags: ["Inventory"],
        method: "GET",
      })
      .output(z.array(inventoryDeviceGroupSchema))
      .handler(async () => {
        const relations = await inventoryDeviceGroupHandler.list()
        return relations ?? []
      }),

    listByDevice: protectedProcedure
      .route({
        summary: "List groups for a device",
        description: "Returns the groups a given device belongs to.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ deviceId: z.string() }))
      .output(z.array(inventoryDeviceGroupSchema))
      .handler(async ({ input }) => {
        const relations = await inventoryDeviceGroupHandler.listByDevice(
          input.deviceId
        )
        return relations ?? []
      }),

    listByGroup: protectedProcedure
      .route({
        summary: "List devices for a group",
        description: "Returns the devices that belong to a given group.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ groupId: z.string() }))
      .output(z.array(inventoryDeviceGroupSchema))
      .handler(async ({ input }) => {
        const relations = await inventoryDeviceGroupHandler.listByGroup(
          input.groupId
        )
        return relations ?? []
      }),

    unassign: protectedProcedure
      .route({
        summary: "Unassign a device from a group",
        description:
          "Removes the relation between a device and a group. Returns the removed relation, or null.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(deviceGroupInput)
      .output(inventoryDeviceGroupSchema.nullable())
      .handler(async ({ input }) => {
        const relation = await inventoryDeviceGroupHandler.unassign(
          input.deviceId,
          input.groupId
        )
        return relation ?? null
      }),
  },
}
