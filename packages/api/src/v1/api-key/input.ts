import z from "zod"

export const apiKeyInput = {
  create: z.object({
    name: z.string().min(1).max(64).optional(),
    expiresIn: z
      .number()
      .int()
      .min(60 * 60)
      .max(60 * 60 * 24 * 365)
      .optional(),
  }),
  remove: z.object({ id: z.string() }),
}
