import z from "zod"
import {
  inventoryDeviceGroupHandler,
  inventoryDeviceHandler,
  inventoryGroupHandler,
} from "@/handlers/inventory"
import { protectedProcedure } from "@/index"

const groupInput = z.object({
  name: z.string(),
  description: z.string().optional(),
})

const uuidSchema = z.string().uuid()

const deviceInput = z.object({
  name: z.string(),
  description: z.string().optional(),
  ipAddress: z.string(),
  credentialId: uuidSchema.nullable().optional(),
})

const deviceGroupInput = z.object({
  deviceId: z.string(),
  groupId: z.string(),
})

export const inventoryRouter = {
  groups: {
    create: protectedProcedure
      .route({
        summary: "Create an inventory group",
        description: "Creates a new inventory group.",
        tags: ["Inventory"],
        method: "POST",
      })
      .input(groupInput)
      .handler(async ({ input }) => {
        const group = await inventoryGroupHandler.createGroup(input)
        return group ?? null
      }),

    list: protectedProcedure
      .route({
        summary: "List inventory groups",
        description: "Lists all inventory groups.",
        tags: ["Inventory"],
        method: "GET",
      })
      .handler(async () => {
        const groups = await inventoryGroupHandler.listGroups()
        return groups ?? []
      }),

    get: protectedProcedure
      .route({
        summary: "Get an inventory group",
        description: "Gets an inventory group by ID.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const group = await inventoryGroupHandler.getGroup(input.id)
        return group ?? null
      }),

    update: protectedProcedure
      .route({
        summary: "Update an inventory group",
        description: "Updates an inventory group by ID.",
        tags: ["Inventory"],
        method: "PUT",
      })
      .input(groupInput.extend({ id: z.string() }))
      .handler(async ({ input }) => {
        const { id, ...data } = input
        const group = await inventoryGroupHandler.updateGroup(id, data)
        return group ?? null
      }),

    delete: protectedProcedure
      .route({
        summary: "Delete an inventory group",
        description: "Deletes an inventory group by ID.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const group = await inventoryGroupHandler.deleteGroup(input.id)
        return group ?? null
      }),
  },

  devices: {
    create: protectedProcedure
      .route({
        summary: "Create an inventory device",
        description: "Creates a new inventory device.",
        tags: ["Inventory"],
        method: "POST",
      })
      .input(deviceInput)
      .handler(async ({ input }) => {
        const device = await inventoryDeviceHandler.createDevice(input)
        return device ?? null
      }),

    list: protectedProcedure
      .route({
        summary: "List inventory devices",
        description: "Lists all inventory devices.",
        tags: ["Inventory"],
        method: "GET",
      })
      .handler(async () => {
        const devices = await inventoryDeviceHandler.listDevices()
        return devices ?? []
      }),

    get: protectedProcedure
      .route({
        summary: "Get an inventory device",
        description: "Gets an inventory device by ID.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        const device = await inventoryDeviceHandler.getDevice(input.id)
        return device ?? null
      }),

    update: protectedProcedure
      .route({
        summary: "Update an inventory device",
        description: "Updates an inventory device by ID.",
        tags: ["Inventory"],
        method: "PUT",
      })
      .input(deviceInput.extend({ id: z.string() }))
      .handler(async ({ input }) => {
        const { id, ...data } = input
        const device = await inventoryDeviceHandler.updateDevice(id, data)
        return device ?? null
      }),

    delete: protectedProcedure
      .route({
        summary: "Delete an inventory device",
        description: "Deletes an inventory device by ID.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(z.object({ id: z.string() }))
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
      .handler(async ({ input }) => {
        const relation = await inventoryDeviceGroupHandler.assign(input)
        return relation ?? null
      }),

    list: protectedProcedure
      .route({
        summary: "List device-group relations",
        description: "Lists all device-group relations.",
        tags: ["Inventory"],
        method: "GET",
      })
      .handler(async () => {
        const relations = await inventoryDeviceGroupHandler.list()
        return relations ?? []
      }),

    listByDevice: protectedProcedure
      .route({
        summary: "List groups for a device",
        description: "Lists all group relations for a given device.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ deviceId: z.string() }))
      .handler(async ({ input }) => {
        const relations = await inventoryDeviceGroupHandler.listByDevice(
          input.deviceId
        )
        return relations ?? []
      }),

    listByGroup: protectedProcedure
      .route({
        summary: "List devices for a group",
        description: "Lists all device relations for a given group.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(z.object({ groupId: z.string() }))
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
          "Removes the relation between an inventory device and a group.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(deviceGroupInput)
      .handler(async ({ input }) => {
        const relation = await inventoryDeviceGroupHandler.unassign(
          input.deviceId,
          input.groupId
        )
        return relation ?? null
      }),
  },
}
