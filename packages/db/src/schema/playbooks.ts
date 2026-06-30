import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const playbooks = pgTable("playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type Playbook = typeof playbooks.$inferSelect
export type NewPlaybook = typeof playbooks.$inferInsert
