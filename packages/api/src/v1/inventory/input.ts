import { z } from "zod"
import { groupName, inventoryName } from "#v1/inventory/name"
import { idSchema } from "#v1/schemas"

/** Postgres `cidr` column: IPv4/IPv6 address with an optional /prefix. */
const ipAddress = z.union([z.cidrv4(), z.cidrv6(), z.ipv4(), z.ipv6()])

const group = z.object({
  name: inventoryName,
  description: z.string().optional(),
})

const newGroup = group.extend({ name: groupName })

const device = z.object({
  name: inventoryName,
  description: z.string().optional(),
  ipAddress,
  portSSH: z.number().int().min(1).max(65535).optional(),
  credentialId: idSchema.nullable().optional(),
})

const byId = z.object({ id: idSchema })

const deviceGroup = z.object({ deviceId: idSchema, groupId: idSchema })

export const inventoryInput = {
  groups: {
    create: newGroup,
    get: byId,
    // The reserved name is checked in the handler: a group that already has
    // it stays editable as long as it keeps it.
    update: group.extend({ id: idSchema }),
    delete: byId,
  },
  devices: {
    create: device,
    get: byId,
    update: device.extend({ id: idSchema }),
    delete: byId,
  },
  deviceGroups: {
    assign: deviceGroup,
    listByDevice: z.object({ deviceId: idSchema }),
    listByGroup: z.object({ groupId: idSchema }),
    unassign: deviceGroup,
  },
}
