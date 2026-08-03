import { z } from "zod"

const inventoryItem = z.object({
  id: z.string(),
  type: z.enum(["group", "device"]),
})

export const streamInput = {
  ping: z.object({ deviceId: z.string() }),

  run: z.object({
    playbookId: z.string(),
    inventory: z.array(inventoryItem),
    forks: z.number().int().min(1).default(1),
    extravars: z.record(z.string(), z.string()).default({}),
  }),

  command: z.object({
    inventory: z.array(inventoryItem).min(1),
    command: z.string().min(1),
    module: z.enum(["shell", "command"]).default("shell"),
    become: z.boolean().default(false),
    forks: z.number().int().min(1).max(500).default(1),
  }),

  script: z.object({
    scriptId: z.string(),
    inventory: z.array(inventoryItem).min(1),
    become: z.boolean().default(false),
    forks: z.number().int().min(1).max(500).default(1),
  }),
}
