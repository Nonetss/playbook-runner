import { z } from "zod"

const group = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const device = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ipAddress: z.string(),
  portSSH: z.number().int(),
  credentialId: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const deviceGroup = z.object({
  id: z.string(),
  deviceId: z.string(),
  groupId: z.string(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export const inventoryOutput = {
  groups: {
    create: group,
    list: z.array(group),
    get: group,
    update: group,
    delete: group,
  },
  devices: {
    create: device,
    list: z.array(device),
    get: device,
    update: device,
    delete: device,
  },
  deviceGroups: {
    assign: deviceGroup,
    list: z.array(deviceGroup),
    listByDevice: z.array(deviceGroup),
    listByGroup: z.array(deviceGroup),
    unassign: deviceGroup,
  },
}

export type InventoryGroup = z.infer<typeof group>
export type InventoryDevice = z.infer<typeof device>
export type InventoryDeviceGroup = z.infer<typeof deviceGroup>
