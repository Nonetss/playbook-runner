import { sql } from "drizzle-orm"
import {
  boolean,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { infisicalConnections } from "#schema/infisical-connections"
import { playbookFolders } from "#schema/playbook-folders"
import { playbookRepositories } from "#schema/playbook-repositories"

export const playbooks = pgTable(
  "playbooks",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    description: text(),
    content: text().notNull(),
    folderId: uuid("folder_id").references(() => playbookFolders.id, {
      onDelete: "set null",
    }),
    // `inline` playbooks are authored in the UI; `git` ones are produced by a
    // repository sync (read-only, keyed by repository + path).
    source: text().$type<"inline" | "git">().notNull().default("inline"),
    repositoryId: uuid("repository_id").references(
      () => playbookRepositories.id,
      { onDelete: "cascade" }
    ),
    path: text(),
    missing: boolean().notNull().default(false),
    // Set through `playbooks.secretVariables`, which a repository sync never
    // touches. Restrict for the same reason as `jobs.infisical_connection_id`.
    infisicalConnectionId: uuid("infisical_connection_id").references(
      () => infisicalConnections.id,
      { onDelete: "restrict" }
    ),
    infisicalEnvironment: text("infisical_environment"),
    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => [
    unique("playbooks_repository_path_unique").on(
      table.repositoryId,
      table.path
    ),
  ]
)

export type Playbook = typeof playbooks.$inferSelect
export type NewPlaybook = typeof playbooks.$inferInsert
