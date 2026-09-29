import { protectedProcedure } from "#index"
import { scriptsHandler } from "#v1/scripts/handler"
import { scriptsInput } from "#v1/scripts/input"
import { scriptsOutput } from "#v1/scripts/output"

export type { Script } from "#v1/scripts/output"

export const scriptsRouter = {
  create: protectedProcedure
    .route({
      summary: "Create a script",
      description:
        "Persists a new script (name, description, language, content).",
      tags: ["Scripts"],
      method: "POST",
    })
    .input(scriptsInput.create)
    .output(scriptsOutput.create)
    .handler(({ context, input }) => scriptsHandler.create({ context, input })),

  list: protectedProcedure
    .route({
      summary: "List scripts",
      description: "Returns every stored script.",
      tags: ["Scripts"],
      method: "GET",
    })
    .output(scriptsOutput.list)
    .handler(({ context, input }) => scriptsHandler.list({ context, input })),

  get: protectedProcedure
    .route({
      summary: "Get a script",
      description:
        "Returns a single script by id. Fails with NOT_FOUND when no row matches.",
      tags: ["Scripts"],
      method: "GET",
    })
    .input(scriptsInput.get)
    .output(scriptsOutput.get)
    .handler(({ context, input }) => scriptsHandler.get({ context, input })),

  update: protectedProcedure
    .route({
      summary: "Update a script",
      description:
        "Replaces the name, description, language, and content of an existing script. Fails with NOT_FOUND when no row matches.",
      tags: ["Scripts"],
      method: "PUT",
    })
    .input(scriptsInput.update)
    .output(scriptsOutput.update)
    .handler(({ context, input }) => scriptsHandler.update({ context, input })),

  delete: protectedProcedure
    .route({
      summary: "Delete a script",
      description:
        "Deletes a script by id and returns the deleted row. Fails with NOT_FOUND when no row matches.",
      tags: ["Scripts"],
      method: "DELETE",
    })
    .input(scriptsInput.delete)
    .output(scriptsOutput.delete)
    .handler(({ context, input }) => scriptsHandler.delete({ context, input })),
}
