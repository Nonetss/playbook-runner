import z from "zod"

// Public connection shape: the client secret never leaves the backend.
const connection = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  clientId: z.string(),
  // Null only on rows from before this column existed.
  projectId: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export const infisicalConnectionsOutput = {
  create: connection,
  list: z.array(connection),
  get: connection,
  update: connection,
  delete: connection,
  environments: z.array(z.object({ slug: z.string(), name: z.string() })),
  secretNames: z.array(z.string()),
}

export type InfisicalConnection = z.infer<typeof connection>
