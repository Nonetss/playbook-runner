import { z } from "zod"
import { forks } from "#v1/jobs/cron"
import { safeExtravars } from "#v1/run/extravars"
import { infisicalEnvironment, secretVariables } from "#v1/run/secret-variables"
import { inventorySelection } from "#v1/run/selection"
import { idSchema } from "#v1/schemas"

// One path component: the runner looks the directory up by this name.
const roleName = z
  .string()
  .min(1)
  .max(255)
  .refine(
    (name) => name !== "." && name !== ".." && !/[/\0]/.test(name),
    "Invalid role name"
  )

export const runInput = {
  ping: z.object({ deviceId: idSchema }),

  run: z.object({
    playbookId: idSchema,
    inventory: z.array(inventorySelection),
    forks: forks.default(1),
    extravars: safeExtravars.default({}),
    infisicalConnectionId: idSchema.optional(),
    infisicalEnvironment: infisicalEnvironment.optional(),
    secretVariables: secretVariables.default([]),
    disabledRoles: z.array(roleName).max(256).default([]),
  }),

  command: z.object({
    inventory: z.array(inventorySelection).min(1),
    command: z.string().min(1),
    module: z.enum(["shell", "command"]).default("shell"),
    become: z.boolean().default(false),
    forks: forks.default(1),
  }),

  script: z.object({
    scriptId: idSchema,
    inventory: z.array(inventorySelection).min(1),
    become: z.boolean().default(false),
    forks: forks.default(1),
  }),
}
