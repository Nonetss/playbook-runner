import { z } from "zod"

export const grpcDemoOutput = {
  ping: z.object({
    message: z.string().describe("The ansible service's reply message"),
    from_service: z
      .string()
      .describe("Name the ansible service reports for itself"),
    target: z.string().describe("gRPC target that was dialled"),
  }),
}
