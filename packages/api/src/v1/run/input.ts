import { z } from "zod"
import { forks } from "#v1/jobs/cron"
import { safeExtravars } from "#v1/run/extravars"
import { idSchema } from "#v1/schemas"

const inventoryItem = z.object({
  id: idSchema,
  type: z.enum(["group", "device"]),
})

export const runInput = {
  ping: z.object({ deviceId: idSchema }),

  run: z.object({
    playbookId: idSchema,
    inventory: z.array(inventoryItem),
    forks: forks.default(1),
    extravars: safeExtravars.default({}),
  }),

  command: z.object({
    inventory: z.array(inventoryItem).min(1),
    command: z.string().min(1),
    module: z.enum(["shell", "command"]).default("shell"),
    become: z.boolean().default(false),
    forks: forks.default(1),
  }),

  script: z.object({
    scriptId: idSchema,
    inventory: z.array(inventoryItem).min(1),
    become: z.boolean().default(false),
    forks: forks.default(1),
  }),
}
