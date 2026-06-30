import { db } from "@none.stack/db"
import {
  credentials,
  type NewCredential,
} from "@none.stack/db/schema/credentials"
import { asc, eq } from "drizzle-orm"

export const credentialsHandler = {
  create: async (credential: NewCredential) => {
    const c = await db.insert(credentials).values(credential).returning()
    return c[0] ?? null
  },

  list: async () => {
    const c = await db
      .select()
      .from(credentials)
      .orderBy(asc(credentials.createdAt))
    return c
  },

  get: async (id: number) => {
    const c = await db.select().from(credentials).where(eq(credentials.id, id))
    return c[0] ?? null
  },

  update: async (id: number, credential: NewCredential) => {
    const c = await db
      .update(credentials)
      .set(credential)
      .where(eq(credentials.id, id))
      .returning()
    return c[0] ?? null
  },

  delete: async (id: number) => {
    const c = await db
      .delete(credentials)
      .where(eq(credentials.id, id))
      .returning()
    return c[0] ?? null
  },
}
