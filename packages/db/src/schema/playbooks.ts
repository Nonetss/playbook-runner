import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const playbooks = pgTable("playbooks", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  content: text().notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type Playbook = typeof playbooks.$inferSelect
export type NewPlaybook = typeof playbooks.$inferInsert
