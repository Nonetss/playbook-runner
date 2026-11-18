import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const credentials = pgTable("credentials", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  // What it is for: "host" (the SSH key Ansible logs in to a device with) or
  // "git" (identifies the runner to a remote repository: a key or a token).
  scope: text().$type<"host" | "git">().notNull().default("host"),
  // "ssh_key" (private + public key) or "token" (an HTTPS access token for Git).
  type: text().$type<"ssh_key" | "token">().notNull().default("ssh_key"),
  username: text().notNull(),
  // Encrypted at rest. Only SSH credentials have a key pair.
  privateKey: text("private_key"),
  publicKey: text("public_key"),
  // Encrypted at rest. Only token credentials have one.
  token: text(),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
})

export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
