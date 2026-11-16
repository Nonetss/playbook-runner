import { z } from "zod"
import { hostAddress, isHostname } from "#v1/inventory/address"
import { groupName, inventoryName } from "#v1/inventory/name"
import { idSchema } from "#v1/schemas"

/**
 * What the runner connects to: an IPv4/IPv6 address or a DNS name. A /prefix is
 * still accepted on an IP, so callers from when the column was `cidr` keep
 * working, but only the address is stored.
 */
const ipAddress = z
  .union([
    z.cidrv4(),
    z.cidrv6(),
    z.ipv4(),
    z.ipv6(),
    z.string().refine(isHostname),
  ])
  .transform(hostAddress)
  .refine((value) => value.length > 0, "Enter an IP address or a DNS name")

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
