import { sql } from "drizzle-orm"
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const crons = pgTable("crons", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  cronExpression: text().notNull(),
  command: text().notNull(),
  enabled: boolean().default(true),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})
