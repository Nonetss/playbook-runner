import { protectedProcedure } from "#index"
import { credentialsHandler } from "#v1/credentials/handler"
import { credentialsInput } from "#v1/credentials/input"
import { credentialsOutput } from "#v1/credentials/output"

export type { Credential, SshKeyPair } from "#v1/credentials/output"

export const credentialsRouter = {
  generate: protectedProcedure
    .route({
      summary: "Generate an SSH key pair",
      description:
        "Generates a fresh ed25519 SSH key pair in OpenSSH format. Does not persist anything — the caller must submit it via `create` to save it as a credential. Admin only.",
      tags: ["Credentials"],
      method: "POST",
    })
    .input(credentialsInput.generate)
    .output(credentialsOutput.generate)
    .handler(({ context, input }) =>
      credentialsHandler.generate({ context, input })
    ),

  create: protectedProcedure
    .route({
      summary: "Create a credential",
      description:
        "Persists a credential (SSH key + username). The private key is encrypted at rest and never returned. Admin only.",
      tags: ["Credentials"],
      method: "POST",
    })
    .input(credentialsInput.create)
    .output(credentialsOutput.create)
    .handler(({ context, input }) =>
      credentialsHandler.create({ context, input })
    ),

  list: protectedProcedure
    .route({
      summary: "List credentials",
      description: "Returns every stored credential without its private key.",
      tags: ["Credentials"],
      method: "GET",
    })
    .output(credentialsOutput.list)
    .handler(({ context, input }) =>
      credentialsHandler.list({ context, input })
    ),

  get: protectedProcedure
    .route({
      summary: "Get a credential",
      description:
        "Returns a single credential by id. Fails with NOT_FOUND when no credential matches.",
      tags: ["Credentials"],
      method: "GET",
    })
    .input(credentialsInput.get)
    .output(credentialsOutput.get)
    .handler(({ context, input }) =>
      credentialsHandler.get({ context, input })
    ),

  update: protectedProcedure
    .route({
      summary: "Update a credential",
      description:
        "Updates a credential by id. Omitted keys keep the stored ones. Fails with NOT_FOUND when no credential matches. Admin only.",
      tags: ["Credentials"],
      method: "PUT",
    })
    .input(credentialsInput.update)
    .output(credentialsOutput.update)
    .handler(({ context, input }) =>
      credentialsHandler.update({ context, input })
    ),

  delete: protectedProcedure
    .route({
      summary: "Delete a credential",
      description:
        "Deletes a credential by id and returns the deleted row. Fails with NOT_FOUND when no credential matches. Admin only.",
      tags: ["Credentials"],
      method: "DELETE",
    })
    .input(credentialsInput.delete)
    .output(credentialsOutput.delete)
    .handler(({ context, input }) =>
      credentialsHandler.delete({ context, input })
    ),
}
