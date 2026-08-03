import { z } from "zod"

export const grpcDemoInput = {
  ping: z.object({
    message: z
      .string()
      .default("hello from backend")
      .describe("Message echoed back by the ansible service"),
  }),
}
