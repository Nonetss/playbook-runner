import { db } from "@playbook-runner/db"
import { type NewScript, scripts } from "@playbook-runner/db/schema/scripts"
import { asc, eq } from "drizzle-orm"

export const scriptsHandler = {
  create: async (script: NewScript) => {
    const s = await db.insert(scripts).values(script).returning()
    return s[0] ?? null
  },

  list: async () => {
    const s = await db.select().from(scripts).orderBy(asc(scripts.createdAt))
    return s
  },

  get: async (id: string) => {
    const s = await db.select().from(scripts).where(eq(scripts.id, id))
    return s[0] ?? null
  },

  update: async (id: string, script: NewScript) => {
    const s = await db
      .update(scripts)
      .set(script)
      .where(eq(scripts.id, id))
      .returning()
    return s[0] ?? null
  },

  delete: async (id: string) => {
    const s = await db.delete(scripts).where(eq(scripts.id, id)).returning()
    return s[0] ?? null
  },
}
