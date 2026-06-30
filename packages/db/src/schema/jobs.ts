import { sql } from "drizzle-orm"
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { playbooks } from "./playbooks"

export const jobs = pgTable("jobs", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  playbookId: uuid("playbook_id").references(() => playbooks.id, {
    onDelete: "set null",
  }),
  inventoryJson: jsonb("inventory_json").notNull(),
  extravarsJson: jsonb("extravars_json").notNull(),
  forks: integer("forks").notNull().default(1),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export const jobEvents = pgTable("job_events", {
  id: uuid().defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => jobs.id, {
    onDelete: "set null",
  }),
  dataJson: jsonb("data_json").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  finishedAt: timestamp("finished_at"),
})

export const cronsJobs = pgTable("crons_jobs", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  cronExpression: text().notNull(),
  command: text().notNull(),
  enabled: boolean().default(true),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})
