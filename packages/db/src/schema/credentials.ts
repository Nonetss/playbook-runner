import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const credentials = pgTable("credentials", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  username: text().notNull(),
  privateKey: text("private_key").notNull(),
  publicKey: text("public_key").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
