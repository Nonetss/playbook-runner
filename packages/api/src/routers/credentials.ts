import z from "zod"
import { credentialsHandler } from "#handlers/credentials"
import { protectedProcedure } from "#index"
import { generateEd25519KeyPair } from "#lib/ssh-key"

const credentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  privateKey: z.string(),
  publicKey: z.string(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

// Used by `generate` — same shape the handler returns today.
const sshKeyPairSchema = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
})

export type Credential = z.infer<typeof credentialSchema>
export type SshKeyPair = z.infer<typeof sshKeyPairSchema>

export const credentialsRouter = {
  generate: protectedProcedure
    .route({
      summary: "Generate an SSH key pair",
      description:
        "Generates a fresh ed25519 SSH key pair in OpenSSH format. Does not persist anything — the caller must submit it via `create` to save it as a credential.",
      tags: ["Credentials"],
      method: "POST",
    })
    .input(z.object({ comment: z.string().optional() }))
    .output(sshKeyPairSchema)
    .handler(({ input }) => generateEd25519KeyPair(input.comment ?? "")),

  create: protectedProcedure
    .route({
      summary: "Create a credential",
      description:
        "Persists a credential (SSH key + username) for the authenticated user. Used after `generate` or for imported keys.",
      tags: ["Credentials"],
      method: "POST",
    })
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        privateKey: z.string(),
        publicKey: z.string(),
      })
    )
    .output(credentialSchema.nullable())
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.create(input)
      return credential ?? null
    }),

  list: protectedProcedure
    .route({
      summary: "List credentials",
      description:
        "Returns every stored credential for the authenticated user.",
      tags: ["Credentials"],
      method: "GET",
    })
    .output(z.array(credentialSchema))
    .handler(async () => {
      const credentials = await credentialsHandler.list()
      return credentials ?? []
    }),

  get: protectedProcedure
    .route({
      summary: "Get a credential",
      description:
        "Returns a single credential by id. Returns null when no credential matches.",
      tags: ["Credentials"],
      method: "GET",
    })
    .input(z.object({ id: z.string() }))
    .output(credentialSchema.nullable())
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.get(input.id)
      return credential ?? null
    }),

  update: protectedProcedure
    .route({
      summary: "Update a credential",
      description: "Updates a credential's name, username, and SSH keys by id.",
      tags: ["Credentials"],
      method: "PUT",
    })
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        privateKey: z.string(),
        publicKey: z.string(),
      })
    )
    .output(credentialSchema.nullable())
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.update(input.id, input)
      return credential ?? null
    }),

  delete: protectedProcedure
    .route({
      summary: "Delete a credential",
      description:
        "Deletes a credential by id. Returns the deleted row, or null.",
      tags: ["Credentials"],
      method: "DELETE",
    })
    .input(z.object({ id: z.string() }))
    .output(credentialSchema.nullable())
    .handler(async ({ input }) => {
      const credential = await credentialsHandler.delete(input.id)
      return credential ?? null
    }),
}
