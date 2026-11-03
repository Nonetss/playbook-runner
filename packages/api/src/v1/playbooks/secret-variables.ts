import { db } from "@playbook-runner/db"
import { infisicalConnections } from "@playbook-runner/db/schema/infisical-connections"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { playbookSecretVariables } from "@playbook-runner/db/schema/secret-variables"
import { asc, eq } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { playbooksInput } from "#v1/playbooks/input"
import { toSecretVariable } from "#v1/run/secret-variables"

type Input = typeof playbooksInput.secretVariables

/**
 * Lives outside `playbooks.update`, which refuses Git-sourced playbooks: the
 * declaration is stored here, not in the file, and a sync never touches it.
 */
export const playbookSecretVariablesHandler = {
  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["get"]>
  }) => {
    const [playbook] = await db
      .select({
        infisicalConnectionId: playbooks.infisicalConnectionId,
        infisicalEnvironment: playbooks.infisicalEnvironment,
      })
      .from(playbooks)
      .where(eq(playbooks.id, input.id))
    if (!playbook) throw errors.NOT_FOUND()
    const variables = await db
      .select()
      .from(playbookSecretVariables)
      .where(eq(playbookSecretVariables.playbookId, input.id))
      .orderBy(asc(playbookSecretVariables.variableName))
    return { ...playbook, variables: variables.map(toSecretVariable) }
  },

  set: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["set"]>
  }) => {
    if (input.infisicalConnectionId) {
      const [connection] = await db
        .select({ id: infisicalConnections.id })
        .from(infisicalConnections)
        .where(eq(infisicalConnections.id, input.infisicalConnectionId))
      if (!connection) {
        throw errors.BAD_REQUEST({ message: "Unknown Infisical connection" })
      }
    }
    // No connection clears the whole declaration, environment included.
    const infisicalEnvironment = input.infisicalConnectionId
      ? input.infisicalEnvironment
      : null
    return db.transaction(async (tx) => {
      const [playbook] = await tx
        .update(playbooks)
        .set({
          infisicalConnectionId: input.infisicalConnectionId,
          infisicalEnvironment,
          updatedAt: new Date(),
        })
        .where(eq(playbooks.id, input.id))
        .returning({ id: playbooks.id })
      if (!playbook) throw errors.NOT_FOUND()
      await tx
        .delete(playbookSecretVariables)
        .where(eq(playbookSecretVariables.playbookId, input.id))
      if (input.variables.length > 0) {
        await tx.insert(playbookSecretVariables).values(
          input.variables.map((variable) => ({
            playbookId: input.id,
            variableName: variable.name,
            secretName: variable.secretName,
            secretPath: variable.secretPath,
          }))
        )
      }
      return {
        infisicalConnectionId: input.infisicalConnectionId,
        infisicalEnvironment,
        variables: input.variables,
      }
    })
  },
}
