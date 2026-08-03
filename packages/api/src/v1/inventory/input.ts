import z from "zod"

const uuid = z.string().uuid()
const group = z.object({ name: z.string(), description: z.string().optional() })
const device = z.object({
  name: z.string(),
  description: z.string().optional(),
  ipAddress: z.string(),
  portSSH: z.number().int().min(1).max(65535).optional(),
  credentialId: uuid.nullable().optional(),
})

export const inventoryInput = {
  group,
  device,
  deviceGroup: z.object({ deviceId: z.string(), groupId: z.string() }),
  id: z.object({ id: z.string() }),
  deviceId: z.object({ deviceId: z.string() }),
  groupId: z.object({ groupId: z.string() }),
}
