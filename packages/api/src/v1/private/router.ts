import { protectedProcedure } from "#index"
import { privateHandler } from "#v1/private/handler"
import { privateOutput } from "#v1/private/output"

export const privateRouter = {
  data: protectedProcedure
    .route({
      summary: "Get private data",
      description: "Returns the authenticated user with a private message.",
      tags: ["User"],
      method: "GET",
    })
    .output(privateOutput.data)
    .handler(({ context }) => privateHandler.data({ context })),
}
