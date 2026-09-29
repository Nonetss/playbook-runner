import { db } from "@playbook-runner/db"
import { playbookFolders } from "@playbook-runner/db/schema/playbook-folders"
import { asc, eq } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { playbooksInput } from "#v1/playbooks/input"

type FolderInput = typeof playbooksInput.folders

/** Throws BAD_REQUEST when a referenced folder id does not exist. */
export async function assertFolderExists(folderId: string | null | undefined) {
  if (!folderId) return

  const rows = await db
    .select({ id: playbookFolders.id })
    .from(playbookFolders)
    .where(eq(playbookFolders.id, folderId))

  if (!rows[0]) {
    throw errors.BAD_REQUEST({ message: "Playbook folder not found" })
  }
}

export const playbookFoldersHandler = {
  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<FolderInput["create"]>
  }) => {
    const rows = await db.insert(playbookFolders).values(input).returning()
    const row = rows[0]
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return row
  },

  list: async (_: { context: Context; input?: undefined }) => {
    return db.select().from(playbookFolders).orderBy(asc(playbookFolders.name))
  },

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<FolderInput["get"]>
  }) => {
    const rows = await db
      .select()
      .from(playbookFolders)
      .where(eq(playbookFolders.id, input.id))
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<FolderInput["update"]>
  }) => {
    const { id, ...folder } = input
    const rows = await db
      .update(playbookFolders)
      .set({ ...folder, updatedAt: new Date() })
      .where(eq(playbookFolders.id, id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<FolderInput["delete"]>
  }) => {
    const rows = await db
      .delete(playbookFolders)
      .where(eq(playbookFolders.id, input.id))
      .returning()
    const row = rows[0]
    if (!row) throw errors.NOT_FOUND()
    return row
  },
}
