import z from "zod"

const inventory = z
  .array(z.object({ id: z.string().uuid(), type: z.enum(["group", "device"]) }))
  .min(1)

export const runInput = {
  resolve: z.object({ playbookId: z.string().uuid(), inventory }),
  resolveHosts: z.object({ inventory }),
  resolveScript: z.object({ scriptId: z.string().uuid(), inventory }),
  resolveDevice: z.object({ deviceId: z.string().uuid() }),
}
