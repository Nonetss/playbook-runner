import z from "zod"

export const privateOutput = {
  data: z.object({
    message: z.string(),
    user: z.unknown(),
  }),
}
