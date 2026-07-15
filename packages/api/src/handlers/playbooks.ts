import { db } from "@playbook-runner/db"
import { playbookFolders } from "@playbook-runner/db/schema/playbook-folders"
import {
  type NewPlaybook,
  playbooks,
} from "@playbook-runner/db/schema/playbooks"
import { asc, eq, isNull } from "drizzle-orm"

export class PlaybookFolderNotFoundError extends Error {
  constructor() {
    super("Playbook folder not found")
    this.name = "PlaybookFolderNotFoundError"
  }
}

async function assertFolderExists(folderId: string | null | undefined) {
  if (!folderId) return

  const rows = await db
    .select({ id: playbookFolders.id })
    .from(playbookFolders)
    .where(eq(playbookFolders.id, folderId))

  if (!rows[0]) throw new PlaybookFolderNotFoundError()
}

export const playbooksHandler = {
  create: async (playbook: NewPlaybook) => {
    await assertFolderExists(playbook.folderId)
    const p = await db.insert(playbooks).values(playbook).returning()
    return p[0] ?? null
  },

  list: async () => {
    const p = await db
      .select()
      .from(playbooks)
      .orderBy(asc(playbooks.createdAt))
    return p
  },

  listByFolder: async (folderId: string | null) => {
    const condition = folderId
      ? eq(playbooks.folderId, folderId)
      : isNull(playbooks.folderId)
    return db
      .select()
      .from(playbooks)
      .where(condition)
      .orderBy(asc(playbooks.createdAt))
  },

  get: async (id: string) => {
    const p = await db.select().from(playbooks).where(eq(playbooks.id, id))
    return p[0] ?? null
  },

  update: async (id: string, playbook: NewPlaybook) => {
    await assertFolderExists(playbook.folderId)
    const p = await db
      .update(playbooks)
      .set({ ...playbook, updatedAt: new Date() })
      .where(eq(playbooks.id, id))
      .returning()
    return p[0] ?? null
  },

  move: async (id: string, folderId: string | null) => {
    await assertFolderExists(folderId)
    const p = await db
      .update(playbooks)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(playbooks.id, id))
      .returning()
    return p[0] ?? null
  },

  delete: async (id: string) => {
    const p = await db.delete(playbooks).where(eq(playbooks.id, id)).returning()
    return p[0] ?? null
  },
}
