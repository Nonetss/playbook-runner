import { sql } from "drizzle-orm"
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { playbooks } from "./playbooks"

export const jobRunStatusEnum = pgEnum("job_run_status", [
  "pending",
  "running",
  "ok",
  "failed",
])

export const jobs = pgTable("jobs", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  playbookId: uuid("playbook_id").references(() => playbooks.id, {
    onDelete: "set null",
  }),
  inventoryJson: jsonb("inventory_json")
    .$type<Array<{ id: string; type: "group" | "device" }>>()
    .notNull()
    .default([]),
  extravarsJson: jsonb("extravars_json")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  forks: integer("forks").notNull().default(1),
  cronExpression: text("cron_expression"),
  enabled: boolean().notNull().default(true),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert

export const jobRuns = pgTable("job_runs", {
  id: uuid().defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => jobs.id, {
    onDelete: "cascade",
  }),
  status: jobRunStatusEnum().notNull().default("pending"),
  trigger: text().notNull().default("manual"),
  eventsJson: jsonb("events_json")
    .$type<Array<Record<string, unknown>>>()
    .notNull()
    .default([]),
  error: text(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
})

export type JobRun = typeof jobRuns.$inferSelect
export type NewJobRun = typeof jobRuns.$inferInsert
