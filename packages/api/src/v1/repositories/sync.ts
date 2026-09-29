import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import { jobs } from "@playbook-runner/db/schema/jobs"
import { playbookRepositories } from "@playbook-runner/db/schema/playbook-repositories"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { env } from "@playbook-runner/env/server"
import {
  getClient,
  grpcStatus,
  isGrpcError,
  unary,
} from "@playbook-runner/grpc"
import {
  RunnerServiceClient,
  type SyncRepositoryResponse,
} from "@playbook-runner/grpc/stubs"
import { logger } from "@playbook-runner/logger"
import { and, eq, notInArray, sql } from "drizzle-orm"
import { errors } from "#errors"
import { decryptSecret } from "#v1/credentials/crypto"

/** A sync is a full fetch of the branch: allow far more than a unary default. */
const SYNC_TIMEOUT_MS = 5 * 60 * 1000

function serviceToken(): string {
  if (!env.SERVICE_TOKEN) {
    throw errors.SERVICE_UNAVAILABLE({
      message: "gRPC is not configured (SERVICE_TOKEN is missing)",
    })
  }
  return env.SERVICE_TOKEN
}

/** Maps a failed `SyncRepository` call to the API error the user sees. */
function toSyncError(err: unknown, message: string) {
  if (!isGrpcError(err)) return errors.INTERNAL_SERVER_ERROR({ message })
  switch (err.code) {
    case grpcStatus.INVALID_ARGUMENT:
    case grpcStatus.NOT_FOUND:
      return errors.BAD_REQUEST({ message })
    case grpcStatus.RESOURCE_EXHAUSTED:
      return errors.TOO_MANY_REQUESTS({ message })
    default:
      return errors.BAD_GATEWAY({ message })
  }
}

/**
 * Fetch a repository through the ansible service and reconcile its
 * Git-sourced playbooks: upsert one per discovered file (keyed by repository
 * + path, so ids and the jobs using them survive syncs). Files that
 * disappeared are deleted, or flagged `missing` while a job still uses them. A failed sync only records its message.
 */
export async function syncRepository(repositoryId: string) {
  const repository = await db
    .select({
      id: playbookRepositories.id,
      url: playbookRepositories.url,
      branch: playbookRepositories.branch,
      subdir: playbookRepositories.subdir,
      privateKey: credentials.privateKey,
    })
    .from(playbookRepositories)
    .leftJoin(
      credentials,
      eq(credentials.id, playbookRepositories.credentialId)
    )
    .where(eq(playbookRepositories.id, repositoryId))
    .then((rows) => rows[0] ?? null)
  if (!repository) throw errors.NOT_FOUND()

  const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
  let response: SyncRepositoryResponse
  try {
    response = await unary(
      client.syncRepository.bind(client),
      {
        repository_id: repository.id,
        url: repository.url,
        branch: repository.branch,
        subdir: repository.subdir ?? "",
        private_key: repository.privateKey
          ? decryptSecret(repository.privateKey)
          : undefined,
      },
      { token: serviceToken(), timeoutMs: SYNC_TIMEOUT_MS }
    )
  } catch (err) {
    const message = isGrpcError(err)
      ? err.details || "Repository sync failed"
      : err instanceof Error
        ? err.message
        : "Repository sync failed"
    logger.warn({ repositoryId, err }, "repository sync failed")
    await db
      .update(playbookRepositories)
      .set({ lastSyncError: message, updatedAt: new Date() })
      .where(eq(playbookRepositories.id, repositoryId))
    throw toSyncError(err, message)
  }

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ path: playbooks.path })
      .from(playbooks)
      .where(eq(playbooks.repositoryId, repositoryId))
    const known = new Set(existing.map((row) => row.path))

    const now = new Date()
    for (const file of response.playbooks) {
      await tx
        .insert(playbooks)
        .values({
          name: file.path,
          content: file.content,
          source: "git",
          repositoryId,
          path: file.path,
        })
        .onConflictDoUpdate({
          target: [playbooks.repositoryId, playbooks.path],
          set: {
            name: file.path,
            content: file.content,
            missing: false,
            updatedAt: now,
          },
        })
    }

    const paths = response.playbooks.map((file) => file.path)
    // Files gone upstream: drop them unless a job still points at them,
    // in which case they stay flagged `missing` so the job's failure is
    // explained instead of its playbook silently becoming null.
    const vanished = and(
      eq(playbooks.repositoryId, repositoryId),
      paths.length > 0 ? notInArray(playbooks.path, paths) : sql`true`
    )
    const usedByJob = sql`exists (select 1 from ${jobs} where ${jobs.playbookId} = ${playbooks.id})`
    const removed = await tx
      .delete(playbooks)
      .where(and(vanished, sql`not ${usedByJob}`))
      .returning({ id: playbooks.id })
    const missing = await tx
      .update(playbooks)
      .set({ missing: true, updatedAt: now })
      .where(and(vanished, usedByJob))
      .returning({ id: playbooks.id })

    const [updated] = await tx
      .update(playbookRepositories)
      .set({
        lastCommitSha: response.commit,
        lastSyncedAt: now,
        lastSyncError: null,
        updatedAt: now,
      })
      .where(eq(playbookRepositories.id, repositoryId))
      .returning()
    if (!updated) throw errors.NOT_FOUND()

    const added = paths.filter((path) => !known.has(path)).length
    return {
      repository: updated,
      added,
      updated: paths.length - added,
      missing: missing.length,
      removed: removed.length,
    }
  })
}

/** Decrypted private key of a credential; BAD_REQUEST when it does not exist. */
async function credentialKey(credentialId: string | null | undefined) {
  if (!credentialId) return undefined
  const row = await db
    .select({ privateKey: credentials.privateKey })
    .from(credentials)
    .where(eq(credentials.id, credentialId))
    .then((rows) => rows[0] ?? null)
  if (!row) throw errors.BAD_REQUEST({ message: "Credential not found" })
  return decryptSecret(row.privateKey)
}

/**
 * List a remote's branches through the ansible service (`git ls-remote`, no
 * mirror), so the repository form can offer them before anything is saved.
 */
export async function listRemoteBranches(
  url: string,
  credentialId: string | null | undefined
) {
  const privateKey = await credentialKey(credentialId)
  const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
  try {
    const response = await unary(
      client.listBranches.bind(client),
      { url, private_key: privateKey },
      { token: serviceToken(), timeoutMs: 30_000 }
    )
    return {
      branches: response.branches,
      defaultBranch: response.default_branch || null,
    }
  } catch (err) {
    const message = isGrpcError(err)
      ? err.details || "Could not list branches"
      : err instanceof Error
        ? err.message
        : "Could not list branches"
    throw toSyncError(err, message)
  }
}

/** Best effort: the mirror is only a cache, a leftover costs disk, not data. */
export async function deleteRepositoryMirror(repositoryId: string) {
  if (!env.SERVICE_TOKEN) return
  const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
  try {
    await unary(
      client.deleteRepository.bind(client),
      { repository_id: repositoryId },
      { token: env.SERVICE_TOKEN }
    )
  } catch (err) {
    logger.warn({ repositoryId, err }, "could not delete repository mirror")
  }
}
