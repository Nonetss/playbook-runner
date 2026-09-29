import { z } from "zod"
import { idSchema } from "#v1/schemas"

const script = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  language: z.enum(["bash", "python"]).default("bash"),
})

const byId = z.object({ id: idSchema })

export const scriptsInput = {
  create: script,
  get: byId,
  update: script.extend({ id: idSchema }),
  delete: byId,
}
