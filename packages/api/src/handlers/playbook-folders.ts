import { db } from "@playbook-runner/db"
import {
  type NewPlaybookFolder,
  playbookFolders,
} from "@playbook-runner/db/schema/playbook-folders"
import { asc, eq } from "drizzle-orm"

export const playbookFoldersHandler = {
  create: async (folder: NewPlaybookFolder) => {
    const rows = await db.insert(playbookFolders).values(folder).returning()
    return rows[0] ?? null
  },

  list: async () => {
    return db.select().from(playbookFolders).orderBy(asc(playbookFolders.name))
  },

  get: async (id: string) => {
    const rows = await db
      .select()
      .from(playbookFolders)
      .where(eq(playbookFolders.id, id))
    return rows[0] ?? null
  },

  update: async (id: string, folder: NewPlaybookFolder) => {
    const rows = await db
      .update(playbookFolders)
      .set({ ...folder, updatedAt: new Date() })
      .where(eq(playbookFolders.id, id))
      .returning()
    return rows[0] ?? null
  },

  delete: async (id: string) => {
    const rows = await db
      .delete(playbookFolders)
      .where(eq(playbookFolders.id, id))
      .returning()
    return rows[0] ?? null
  },
}
