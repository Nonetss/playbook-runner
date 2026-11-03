import { protectedProcedure } from "#index"
import { infisicalConnectionsHandler } from "#v1/infisical-connections/handler"
import { infisicalConnectionsInput } from "#v1/infisical-connections/input"
import { infisicalConnectionsOutput } from "#v1/infisical-connections/output"

export type { InfisicalConnection } from "#v1/infisical-connections/output"

export const infisicalConnectionsRouter = {
  create: protectedProcedure
    .route({
      summary: "Create an Infisical connection",
      description:
        "Persists an Infisical URL and Universal Auth client id and secret. The client secret is encrypted at rest and never returned.",
      tags: ["Infisical connections"],
      method: "POST",
    })
    .input(infisicalConnectionsInput.create)
    .output(infisicalConnectionsOutput.create)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.create({ context, input })
    ),

  list: protectedProcedure
    .route({
      summary: "List Infisical connections",
      description: "Returns every stored connection without its client secret.",
      tags: ["Infisical connections"],
      method: "GET",
    })
    .output(infisicalConnectionsOutput.list)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.list({ context, input })
    ),

  get: protectedProcedure
    .route({
      summary: "Get an Infisical connection",
      description:
        "Returns a single connection by id. Fails with NOT_FOUND when no connection matches.",
      tags: ["Infisical connections"],
      method: "GET",
    })
    .input(infisicalConnectionsInput.get)
    .output(infisicalConnectionsOutput.get)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.get({ context, input })
    ),

  update: protectedProcedure
    .route({
      summary: "Update an Infisical connection",
      description:
        "Updates a connection by id. An omitted client secret keeps the stored one. Fails with NOT_FOUND when no connection matches.",
      tags: ["Infisical connections"],
      method: "PUT",
    })
    .input(infisicalConnectionsInput.update)
    .output(infisicalConnectionsOutput.update)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.update({ context, input })
    ),

  delete: protectedProcedure
    .route({
      summary: "Delete an Infisical connection",
      description:
        "Deletes a connection by id and returns the deleted row. Fails with CONFLICT while a job or a playbook references it, and with NOT_FOUND when no connection matches.",
      tags: ["Infisical connections"],
      method: "DELETE",
    })
    .input(infisicalConnectionsInput.delete)
    .output(infisicalConnectionsOutput.delete)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.delete({ context, input })
    ),

  environments: protectedProcedure
    .route({
      summary: "List a connection's environments",
      description:
        "Returns the environments of the connection's project through the Ansible service, or an empty list when the Infisical instance does not provide them, so the environment can be typed instead.",
      tags: ["Infisical connections"],
      method: "GET",
    })
    .input(infisicalConnectionsInput.environments)
    .output(infisicalConnectionsOutput.environments)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.environments({ context, input })
    ),

  secretNames: protectedProcedure
    .route({
      summary: "List secret names",
      description:
        "Returns the secret names at an environment and path through the Ansible service, never their values. Fails with BAD_GATEWAY when Infisical cannot answer.",
      tags: ["Infisical connections"],
      method: "GET",
    })
    .input(infisicalConnectionsInput.secretNames)
    .output(infisicalConnectionsOutput.secretNames)
    .handler(({ context, input }) =>
      infisicalConnectionsHandler.secretNames({ context, input })
    ),
}
