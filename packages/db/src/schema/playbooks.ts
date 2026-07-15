import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { playbookFolders } from "#schema/playbook-folders"

export const playbooks = pgTable("playbooks", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  content: text().notNull(),
  folderId: uuid("folder_id").references(() => playbookFolders.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type Playbook = typeof playbooks.$inferSelect
export type NewPlaybook = typeof playbooks.$inferInsert
