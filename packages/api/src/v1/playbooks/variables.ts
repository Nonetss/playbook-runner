import { db } from "@playbook-runner/db"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { env } from "@playbook-runner/env/server"
import { getClient, isGrpcError, unary } from "@playbook-runner/grpc"
import { RunnerServiceClient } from "@playbook-runner/grpc/stubs"
import { eq } from "drizzle-orm"
import { errors } from "#errors"
import { serviceToken, toSyncError } from "#v1/repositories/sync"

const VARIABLES_TIMEOUT_MS = 15_000

/**
 * The variables a playbook written here defines. The runner reads them, so the
 * rules on which values are shown live in one place. A Git playbook gets them
 * with its repository's roles, from the tree at the synced commit.
 */
export async function listPlaybookVariables(playbookId: string) {
  const playbook = await db
    .select({ source: playbooks.source, content: playbooks.content })
    .from(playbooks)
    .where(eq(playbooks.id, playbookId))
    .then((rows) => rows[0] ?? null)
  if (!playbook) throw errors.NOT_FOUND()
  if (playbook.source === "git") return { variables: [] }

  const token = serviceToken()
  const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
  try {
    const response = await unary(
      client.listPlaybookVariables.bind(client),
      { content: playbook.content },
      { token, timeoutMs: VARIABLES_TIMEOUT_MS }
    )
    return {
      variables: response.variables.map((variable) => ({
        name: variable.name,
        value: variable.value ?? null,
        role: variable.role ?? null,
      })),
    }
  } catch (err) {
    const message = isGrpcError(err)
      ? err.details || "Could not list variables"
      : err instanceof Error
        ? err.message
        : "Could not list variables"
    throw toSyncError(err, message)
  }
}
