import { z } from "zod"

const script = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  language: z.enum(["bash", "python"]),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Script = z.infer<typeof script>

export const scriptsOutput = {
  create: script,
  list: z.array(script),
  get: script,
  update: script,
  delete: script,
}
