import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const scripts = pgTable("scripts", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  content: text().notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type Script = typeof scripts.$inferSelect
export type NewScript = typeof scripts.$inferInsert
