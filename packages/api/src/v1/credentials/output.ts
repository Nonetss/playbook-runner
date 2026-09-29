import z from "zod"

// Public credential shape: the private key never leaves the backend.
const credential = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  publicKey: z.string(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

// `generate` returns the fresh, not-yet-persisted pair to the admin.
const keyPair = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
})

export const credentialsOutput = {
  generate: keyPair,
  create: credential,
  list: z.array(credential),
  get: credential,
  update: credential,
  delete: credential,
}

export type Credential = z.infer<typeof credential>
export type SshKeyPair = z.infer<typeof keyPair>
