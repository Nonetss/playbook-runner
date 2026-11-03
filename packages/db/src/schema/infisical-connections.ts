import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const infisicalConnections = pgTable("infisical_connections", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  url: text().notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  // Nullable so rows from before this column survive the migration; the API
  // requires it and a run through a connection without one fails.
  projectId: text("project_id"),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type InfisicalConnection = typeof infisicalConnections.$inferSelect
export type NewInfisicalConnection = typeof infisicalConnections.$inferInsert
