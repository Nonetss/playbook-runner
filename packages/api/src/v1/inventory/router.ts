import { protectedProcedure } from "#index"
import {
  inventoryDeviceGroupHandler,
  inventoryDeviceHandler,
  inventoryGroupHandler,
} from "#v1/inventory/handler"
import { inventoryInput } from "#v1/inventory/input"
import { inventoryOutput } from "#v1/inventory/output"

export type {
  InventoryDevice,
  InventoryDeviceGroup,
  InventoryGroup,
} from "#v1/inventory/output"

export const inventoryRouter = {
  groups: {
    create: protectedProcedure
      .route({
        summary: "Create an inventory group",
        description: "Persists a new inventory group.",
        tags: ["Inventory"],
        method: "POST",
      })
      .input(inventoryInput.groups.create)
      .output(inventoryOutput.groups.create)
      .handler(({ context, input }) =>
        inventoryGroupHandler.create({ context, input })
      ),

    list: protectedProcedure
      .route({
        summary: "List inventory groups",
        description: "Returns every stored inventory group.",
        tags: ["Inventory"],
        method: "GET",
      })
      .output(inventoryOutput.groups.list)
      .handler(({ context }) => inventoryGroupHandler.list({ context })),

    get: protectedProcedure
      .route({
        summary: "Get an inventory group",
        description:
          "Returns an inventory group by id. Throws NOT_FOUND when no row matches.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(inventoryInput.groups.get)
      .output(inventoryOutput.groups.get)
      .handler(({ context, input }) =>
        inventoryGroupHandler.get({ context, input })
      ),

    update: protectedProcedure
      .route({
        summary: "Update an inventory group",
        description:
          "Replaces the name and description of an existing inventory group. Throws NOT_FOUND when no row matches.",
        tags: ["Inventory"],
        method: "PUT",
      })
      .input(inventoryInput.groups.update)
      .output(inventoryOutput.groups.update)
      .handler(({ context, input }) =>
        inventoryGroupHandler.update({ context, input })
      ),

    delete: protectedProcedure
      .route({
        summary: "Delete an inventory group",
        description:
          "Deletes an inventory group by id and returns the deleted row. Throws NOT_FOUND when no row matches.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(inventoryInput.groups.delete)
      .output(inventoryOutput.groups.delete)
      .handler(({ context, input }) =>
        inventoryGroupHandler.delete({ context, input })
      ),
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
      .input(inventoryInput.devices.create)
      .output(inventoryOutput.devices.create)
      .handler(({ context, input }) =>
        inventoryDeviceHandler.create({ context, input })
      ),

    list: protectedProcedure
      .route({
        summary: "List inventory devices",
        description: "Returns every stored inventory device.",
        tags: ["Inventory"],
        method: "GET",
      })
      .output(inventoryOutput.devices.list)
      .handler(({ context }) => inventoryDeviceHandler.list({ context })),

    get: protectedProcedure
      .route({
        summary: "Get an inventory device",
        description:
          "Returns an inventory device by id. Throws NOT_FOUND when no row matches.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(inventoryInput.devices.get)
      .output(inventoryOutput.devices.get)
      .handler(({ context, input }) =>
        inventoryDeviceHandler.get({ context, input })
      ),

    update: protectedProcedure
      .route({
        summary: "Update an inventory device",
        description:
          "Replaces all editable fields of an inventory device, including its credential link. Throws NOT_FOUND when no row matches.",
        tags: ["Inventory"],
        method: "PUT",
      })
      .input(inventoryInput.devices.update)
      .output(inventoryOutput.devices.update)
      .handler(({ context, input }) =>
        inventoryDeviceHandler.update({ context, input })
      ),

    delete: protectedProcedure
      .route({
        summary: "Delete an inventory device",
        description:
          "Deletes an inventory device by id and returns the deleted row. Throws NOT_FOUND when no row matches.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(inventoryInput.devices.delete)
      .output(inventoryOutput.devices.delete)
      .handler(({ context, input }) =>
        inventoryDeviceHandler.delete({ context, input })
      ),
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
      .input(inventoryInput.deviceGroups.assign)
      .output(inventoryOutput.deviceGroups.assign)
      .handler(({ context, input }) =>
        inventoryDeviceGroupHandler.assign({ context, input })
      ),

    list: protectedProcedure
      .route({
        summary: "List device-group relations",
        description: "Returns every device-group relation.",
        tags: ["Inventory"],
        method: "GET",
      })
      .output(inventoryOutput.deviceGroups.list)
      .handler(({ context }) => inventoryDeviceGroupHandler.list({ context })),

    listByDevice: protectedProcedure
      .route({
        summary: "List groups for a device",
        description: "Returns the groups a given device belongs to.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(inventoryInput.deviceGroups.listByDevice)
      .output(inventoryOutput.deviceGroups.listByDevice)
      .handler(({ context, input }) =>
        inventoryDeviceGroupHandler.listByDevice({ context, input })
      ),

    listByGroup: protectedProcedure
      .route({
        summary: "List devices for a group",
        description: "Returns the devices that belong to a given group.",
        tags: ["Inventory"],
        method: "GET",
      })
      .input(inventoryInput.deviceGroups.listByGroup)
      .output(inventoryOutput.deviceGroups.listByGroup)
      .handler(({ context, input }) =>
        inventoryDeviceGroupHandler.listByGroup({ context, input })
      ),

    unassign: protectedProcedure
      .route({
        summary: "Unassign a device from a group",
        description:
          "Removes the relation between a device and a group and returns it. Throws NOT_FOUND when no relation matches.",
        tags: ["Inventory"],
        method: "DELETE",
      })
      .input(inventoryInput.deviceGroups.unassign)
      .output(inventoryOutput.deviceGroups.unassign)
      .handler(({ context, input }) =>
        inventoryDeviceGroupHandler.unassign({ context, input })
      ),
  },
}
