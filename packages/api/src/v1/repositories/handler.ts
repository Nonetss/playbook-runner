import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import { playbookRepositories } from "@playbook-runner/db/schema/playbook-repositories"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { asc, eq, getTableColumns, sql } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { repositoriesInput } from "#v1/repositories/input"
import { deleteRepositoryMirror, syncRepository } from "#v1/repositories/sync"

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
    await assertCredentialExists(input.credentialId)
    const rows = await db.insert(playbookRepositories).values(input).returning()
    const row = rows[0]
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return row
  },

  list: async (_: { context: Context; input?: undefined }) => {
    return db
      .select({
        ...getTableColumns(playbookRepositories),
        playbookCount: sql<number>`(select count(*)::int from ${playbooks} where ${playbooks.repositoryId} = ${playbookRepositories.id} and not ${playbooks.missing})`,
      })
      .from(playbookRepositories)
      .orderBy(asc(playbookRepositories.name))
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
    return row
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["update"]>
  }) => {
    const { id, ...repository } = input
    await assertCredentialExists(repository.credentialId)
    const rows = await db
      .update(playbookRepositories)
      .set({ ...repository, updatedAt: new Date() })
      .where(eq(playbookRepositories.id, id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return row
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
    return row
  },

  sync: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["sync"]>
  }) => syncRepository(input.id),

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
}
