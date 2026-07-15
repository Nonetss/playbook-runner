import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const playbookFolders = pgTable("playbook_folders", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type PlaybookFolder = typeof playbookFolders.$inferSelect
export type NewPlaybookFolder = typeof playbookFolders.$inferInsert
