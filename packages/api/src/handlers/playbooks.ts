import { db } from "@playbook-runner/db"
import {
  type NewPlaybook,
  playbooks,
} from "@playbook-runner/db/schema/playbooks"
import { asc, eq } from "drizzle-orm"

export const playbooksHandler = {
  create: async (playbook: NewPlaybook) => {
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

  get: async (id: string) => {
    const p = await db.select().from(playbooks).where(eq(playbooks.id, id))
    return p[0] ?? null
  },

  update: async (id: string, playbook: NewPlaybook) => {
    const p = await db
      .update(playbooks)
      .set(playbook)
      .where(eq(playbooks.id, id))
      .returning()
    return p[0] ?? null
  },

  delete: async (id: string) => {
    const p = await db.delete(playbooks).where(eq(playbooks.id, id)).returning()
    return p[0] ?? null
  },
}
