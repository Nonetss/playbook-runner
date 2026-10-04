import z from "zod"

export const authConfigOutput = {
  get: z.object({
    ssoEnabled: z
      .boolean()
      .describe("Whether SSO (OIDC) sign-in is configured on the server"),
  }),
}
