import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  privateKey: text("private_key").notNull(),
  publicKey: text("public_key").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
