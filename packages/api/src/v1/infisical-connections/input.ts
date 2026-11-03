import z from "zod"
import { infisicalEnvironment } from "#v1/run/secret-variables"
import { idSchema } from "#v1/schemas"

const connection = z.object({
  name: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  projectId: z.string().trim().min(1),
})

export const infisicalConnectionsInput = {
  create: connection,
  get: z.object({ id: idSchema }),
  // An omitted secret keeps the stored one.
  update: connection.partial({ clientSecret: true }).extend({ id: idSchema }),
  delete: z.object({ id: idSchema }),
  environments: z.object({ id: idSchema }),
  secretNames: z.object({
    id: idSchema,
    environment: infisicalEnvironment,
    secretPath: z.string().trim().startsWith("/").default("/"),
  }),
}
