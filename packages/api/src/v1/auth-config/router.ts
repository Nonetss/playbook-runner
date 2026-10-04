import { publicProcedure } from "#index"
import { authConfigHandler } from "#v1/auth-config/handler"
import { authConfigOutput } from "#v1/auth-config/output"

export const authConfigRouter = {
  get: publicProcedure
    .route({
      summary: "Get public auth configuration",
      description:
        "Returns which optional sign-in methods are configured on the server (e.g. SSO), so the frontend can hide unavailable options. Safe to call while unauthenticated.",
      tags: ["System"],
      method: "GET",
    })
    .output(authConfigOutput.get)
    .handler(({ context }) => authConfigHandler.get({ context })),
}
