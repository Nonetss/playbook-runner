import z from "zod"

const script = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  language: z.enum(["bash", "python"]).default("bash"),
})

export const scriptsInput = {
  create: script,
  get: z.object({ id: z.string() }),
  update: script.extend({ id: z.string() }),
  remove: z.object({ id: z.string() }),
}
