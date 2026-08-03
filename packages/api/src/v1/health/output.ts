import z from "zod"

export const healthOutput = {
  check: z.literal("OK"),
}
