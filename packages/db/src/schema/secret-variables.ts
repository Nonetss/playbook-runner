import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

import { jobs } from "#schema/jobs"
import { playbooks } from "#schema/playbooks"

// Only references to secrets live here: the runner fetches the values for each
// run and they are never stored.
export const playbookSecretVariables = pgTable(
  "playbook_secret_variables",
  {
    id: uuid().defaultRandom().primaryKey(),
    playbookId: uuid("playbook_id")
      .notNull()
      .references(() => playbooks.id, { onDelete: "cascade" }),
    variableName: text("variable_name").notNull(),
    secretName: text("secret_name").notNull(),
    secretPath: text("secret_path").notNull().default("/"),

    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => [
    unique("playbook_secret_variables_playbook_variable_unique").on(
      table.playbookId,
      table.variableName
    ),
  ]
)

export type PlaybookSecretVariable = typeof playbookSecretVariables.$inferSelect
export type NewPlaybookSecretVariable =
  typeof playbookSecretVariables.$inferInsert

// A job's own entries only, so later changes to the playbook's declaration
// still reach the job.
export const jobSecretVariables = pgTable(
  "job_secret_variables",
  {
    id: uuid().defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    variableName: text("variable_name").notNull(),
    secretName: text("secret_name").notNull(),
    secretPath: text("secret_path").notNull().default("/"),

    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => [
    unique("job_secret_variables_job_variable_unique").on(
      table.jobId,
      table.variableName
    ),
  ]
)

export type JobSecretVariable = typeof jobSecretVariables.$inferSelect
export type NewJobSecretVariable = typeof jobSecretVariables.$inferInsert
