import z from "zod"

const item = z.object({
  id: z.string(),
  name: z.string().nullable(),
  start: z.string().nullable(),
  prefix: z.string().nullable(),
  enabled: z.boolean(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})

export const apiKeyOutput = {
  list: z.array(item),
  create: item.extend({ key: z.string() }),
  remove: z.object({ id: z.string(), success: z.boolean() }),
}

export type ApiKeyListItem = z.infer<typeof item>
export type ApiKey = z.infer<typeof apiKeyOutput.create>
