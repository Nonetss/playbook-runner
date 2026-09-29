import { db } from "@playbook-runner/db"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { and, asc, eq, isNull } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import {
  assertFolderExists,
  playbookFoldersHandler,
} from "#v1/playbooks/folders"
import type { playbooksInput } from "#v1/playbooks/input"

type Input = typeof playbooksInput

/**
 * Git-sourced playbooks are owned by their repository sync: they can be
 * viewed, run and scheduled, but never edited, moved or deleted by hand.
 * Throws NOT_FOUND for unknown ids.
 */
async function assertInline(id: string) {
  const row = await db
    .select({ source: playbooks.source })
    .from(playbooks)
    .where(eq(playbooks.id, id))
    .then((rows) => rows[0] ?? null)
  if (!row) throw errors.NOT_FOUND()
  if (row.source === "git") {
    throw errors.FORBIDDEN({
      message: "Playbooks synced from a Git repository are read-only",
    })
  }
}

export const playbooksHandler = {
  folders: playbookFoldersHandler,

  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["create"]>
  }) => {
    await assertFolderExists(input.folderId)
    const rows = await db
      .insert(playbooks)
      .values({ ...input, source: "inline" })
      .returning()
    const row = rows[0]
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return row
  },

  list: async (_: { context: Context; input?: undefined }) => {
    return db.select().from(playbooks).orderBy(asc(playbooks.createdAt))
  },

  listByFolder: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["listByFolder"]>
  }) => {
    // Git-sourced playbooks are browsed through their repository.
    const condition = and(
      eq(playbooks.source, "inline"),
      input.folderId
        ? eq(playbooks.folderId, input.folderId)
        : isNull(playbooks.folderId)
    )
    return db
      .select()
      .from(playbooks)
      .where(condition)
      .orderBy(asc(playbooks.createdAt))
  },

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["get"]>
  }) => {
    const rows = await db
      .select()
      .from(playbooks)
      .where(eq(playbooks.id, input.id))
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
    const { id, ...playbook } = input
    await assertInline(id)
    await assertFolderExists(playbook.folderId)
    const rows = await db
      .update(playbooks)
      .set({ ...playbook, updatedAt: new Date() })
      .where(eq(playbooks.id, id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  move: async ({
    input,
  }: {
    context: Context
    input: z.infer<Input["move"]>
  }) => {
    await assertInline(input.id)
    await assertFolderExists(input.folderId)
    const rows = await db
      .update(playbooks)
      .set({ folderId: input.folderId, updatedAt: new Date() })
      .where(eq(playbooks.id, input.id))
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
    await assertInline(input.id)
    const rows = await db
      .delete(playbooks)
      .where(eq(playbooks.id, input.id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return row
  },
}
