import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import { playbookRepositories } from "@playbook-runner/db/schema/playbook-repositories"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { and, asc, eq, getTableColumns, sql } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { repositoriesInput } from "#v1/repositories/input"
import {
  deleteRepositoryMirror,
  listRemoteBranches,
  listRepositoryRoles,
  syncRepository,
} from "#v1/repositories/sync"
import {
  hideVaultPassword,
  vaultPasswordColumn,
} from "#v1/repositories/vault-password"

type Input = typeof repositoriesInput

/** Throws BAD_REQUEST when a referenced credential id does not exist. */
async function assertCredentialExists(credentialId: string | null | undefined) {
  if (!credentialId) return
  const rows = await db
    .select({ id: credentials.id })
    .from(credentials)
    .where(eq(credentials.id, credentialId))
  if (!rows[0]) {
    throw errors.BAD_REQUEST({ message: "Credential not found" })
  }
}

export const repositoriesHandler = {
  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["create"]>
  }) => {
    const { vaultPassword, ...repository } = input
    await assertCredentialExists(repository.credentialId)
    const rows = await db
      .insert(playbookRepositories)
      .values({ ...repository, ...vaultPasswordColumn(vaultPassword) })
      .returning()
    const row = rows[0]
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return hideVaultPassword(row)
  },

  list: async (_: { context: Context; input?: undefined }) => {
    const rows = await db
      .select({
        ...getTableColumns(playbookRepositories),
        // Nested in its own expression so the columns stay qualified: a
        // single-table select strips the table from top-level ones.
        playbookCount: sql<number>`(select count(*)::int from ${playbooks} where ${and(eq(playbooks.repositoryId, playbookRepositories.id), eq(playbooks.missing, false))})`,
      })
      .from(playbookRepositories)
      .orderBy(asc(playbookRepositories.name))
    return rows.map(hideVaultPassword)
  },

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["get"]>
  }) => {
    const rows = await db
      .select()
      .from(playbookRepositories)
      .where(eq(playbookRepositories.id, input.id))
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return hideVaultPassword(row)
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["update"]>
  }) => {
    const { id, vaultPassword, ...repository } = input
    await assertCredentialExists(repository.credentialId)
    const rows = await db
      .update(playbookRepositories)
      .set({
        ...repository,
        ...vaultPasswordColumn(vaultPassword),
        updatedAt: new Date(),
      })
      .where(eq(playbookRepositories.id, id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return hideVaultPassword(row)
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["delete"]>
  }) => {
    // Its Git-sourced playbooks cascade; jobs using them keep a null playbook.
    const rows = await db
      .delete(playbookRepositories)
      .where(eq(playbookRepositories.id, input.id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    await deleteRepositoryMirror(row.id)
    return hideVaultPassword(row)
  },

  sync: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["sync"]>
  }) => syncRepository(input.id),

  branches: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["branches"]>
  }) => listRemoteBranches(input.url, input.credentialId),

  playbooks: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<Input["playbooks"]>
  }) => {
    await repositoriesHandler.get({ context, input })
    return db
      .select()
      .from(playbooks)
      .where(eq(playbooks.repositoryId, input.id))
      .orderBy(asc(playbooks.path))
  },

  roles: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["roles"]>
  }) => listRepositoryRoles(input.id),
}
