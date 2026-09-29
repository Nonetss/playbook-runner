import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { credentials } from "#schema/credentials"

export const playbookRepositories = pgTable("playbook_repositories", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  url: text().notNull(),
  branch: text().notNull().default("main"),
  subdir: text(),
  credentialId: uuid("credential_id").references(() => credentials.id, {
    onDelete: "set null",
  }),
  lastCommitSha: text("last_commit_sha"),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncError: text("last_sync_error"),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type PlaybookRepository = typeof playbookRepositories.$inferSelect
export type NewPlaybookRepository = typeof playbookRepositories.$inferInsert
