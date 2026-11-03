import { db } from "@playbook-runner/db"
import { infisicalConnections } from "@playbook-runner/db/schema/infisical-connections"
import { jobs } from "@playbook-runner/db/schema/jobs"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { env } from "@playbook-runner/env/server"
import { getClient, isGrpcError, unary } from "@playbook-runner/grpc"
import { RunnerServiceClient } from "@playbook-runner/grpc/stubs"
import { asc, eq } from "drizzle-orm"
import type z from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import { encryptSecret } from "#v1/credentials/crypto"
import type { infisicalConnectionsInput } from "#v1/infisical-connections/input"
import {
  ResolveRunNotFoundError,
  resolveInfisicalConnection,
} from "#v1/run/resolve"

const LIST_TIMEOUT_MS = 30_000

// Explicit columns so the (encrypted) client secret never reaches the router.
const publicColumns = {
  id: infisicalConnections.id,
  name: infisicalConnections.name,
  url: infisicalConnections.url,
  clientId: infisicalConnections.clientId,
  projectId: infisicalConnections.projectId,
  createdAt: infisicalConnections.createdAt,
  updatedAt: infisicalConnections.updatedAt,
}

function serviceToken(): string {
  if (!env.SERVICE_TOKEN) {
    throw errors.SERVICE_UNAVAILABLE({
      message: "gRPC is not configured (SERVICE_TOKEN is missing)",
    })
  }
  return env.SERVICE_TOKEN
}

async function connectionOrNotFound(connectionId: string) {
  try {
    return await resolveInfisicalConnection(connectionId)
  } catch (err) {
    if (err instanceof ResolveRunNotFoundError) throw errors.NOT_FOUND()
    throw err
  }
}

/** The runner builds these messages, and they never hold credentials. */
function toListingError(err: unknown) {
  return errors.BAD_GATEWAY({
    message: isGrpcError(err)
      ? err.details || "Could not reach Infisical"
      : "Could not reach Infisical",
  })
}

export const infisicalConnectionsHandler = {
  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof infisicalConnectionsInput.create>
  }) => {
    const [row] = await db
      .insert(infisicalConnections)
      .values({
        name: input.name,
        url: input.url,
        clientId: input.clientId,
        clientSecret: encryptSecret(input.clientSecret),
        projectId: input.projectId,
      })
      .returning(publicColumns)
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return row
  },

  list: async (_: { context: Context; input?: unknown }) => {
    return db
      .select(publicColumns)
      .from(infisicalConnections)
      .orderBy(asc(infisicalConnections.createdAt))
  },

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof infisicalConnectionsInput.get>
  }) => {
    const [row] = await db
      .select(publicColumns)
      .from(infisicalConnections)
      .where(eq(infisicalConnections.id, input.id))
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof infisicalConnectionsInput.update>
  }) => {
    const [row] = await db
      .update(infisicalConnections)
      .set({
        name: input.name,
        url: input.url,
        clientId: input.clientId,
        projectId: input.projectId,
        ...(input.clientSecret
          ? { clientSecret: encryptSecret(input.clientSecret) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(infisicalConnections.id, input.id))
      .returning(publicColumns)
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof infisicalConnectionsInput.delete>
  }) => {
    const [inUse] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.infisicalConnectionId, input.id))
      .limit(1)
    const [usedByPlaybook] = inUse
      ? [inUse]
      : await db
          .select({ id: playbooks.id })
          .from(playbooks)
          .where(eq(playbooks.infisicalConnectionId, input.id))
          .limit(1)
    if (usedByPlaybook) {
      throw errors.CONFLICT({
        message: "The connection is used by at least one job or playbook",
      })
    }
    const [row] = await db
      .delete(infisicalConnections)
      .where(eq(infisicalConnections.id, input.id))
      .returning(publicColumns)
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  environments: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof infisicalConnectionsInput.environments>
  }) => {
    const token = serviceToken()
    const { auth, projectId } = await connectionOrNotFound(input.id)
    if (!projectId) return []
    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    try {
      const response = await unary(
        client.listInfisicalEnvironments.bind(client),
        { auth, project_id: projectId },
        { token, timeoutMs: LIST_TIMEOUT_MS }
      )
      return response.environments
    } catch (err) {
      throw toListingError(err)
    }
  },

  secretNames: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof infisicalConnectionsInput.secretNames>
  }) => {
    const token = serviceToken()
    const { auth, projectId } = await connectionOrNotFound(input.id)
    if (!projectId) {
      throw errors.PRECONDITION_FAILED({
        message: "The Infisical connection has no project id",
      })
    }
    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    try {
      const response = await unary(
        client.listInfisicalSecretNames.bind(client),
        {
          auth,
          project_id: projectId,
          environment: input.environment,
          secret_path: input.secretPath,
        },
        { token, timeoutMs: LIST_TIMEOUT_MS }
      )
      return response.names
    } catch (err) {
      throw toListingError(err)
    }
  },
}
