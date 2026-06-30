import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text(),
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
    role: text(),
    banned: boolean().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (table) => [unique("user_email_unique").on(table.email)]
)

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text().notNull(),
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
  },
  (table) => [
    index("session_userId_idx").using("btree", table.userId.asc().nullsLast()),
    unique("session_token_unique").on(table.token),
  ]
)

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("account_userId_idx").using("btree", table.userId.asc().nullsLast()),
  ]
)

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
  },
  (table) => [
    index("verification_identifier_idx").using(
      "btree",
      table.identifier.asc().nullsLast()
    ),
  ]
)

export const organization = pgTable(
  "organization",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    createdAt: timestamp("created_at").notNull(),
    metadata: text(),
  },
  (table) => [
    uniqueIndex("organization_slug_uidx").using(
      "btree",
      table.slug.asc().nullsLast()
    ),
    unique("organization_slug_unique").on(table.slug),
  ]
)

export const organizationRole = pgTable(
  "organization_role",
  {
    id: text().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text().notNull(),
    permission: text().notNull(),
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("organizationRole_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast()
    ),
    index("organizationRole_role_idx").using(
      "btree",
      table.role.asc().nullsLast()
    ),
  ]
)

export const team = pgTable(
  "team",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("team_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast()
    ),
  ]
)

export const teamMember = pgTable(
  "team_member",
  {
    id: text().primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("teamMember_teamId_idx").using(
      "btree",
      table.teamId.asc().nullsLast()
    ),
    index("teamMember_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast()
    ),
  ]
)

export const member = pgTable(
  "member",
  {
    id: text().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text().default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("member_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast()
    ),
    index("member_userId_idx").using("btree", table.userId.asc().nullsLast()),
  ]
)

export const invitation = pgTable(
  "invitation",
  {
    id: text().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text().notNull(),
    role: text(),
    teamId: text("team_id"),
    status: text().default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_email_idx").using("btree", table.email.asc().nullsLast()),
    index("invitation_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast()
    ),
  ]
)

export const apikey = pgTable(
  "apikey",
  {
    id: text().primaryKey(),
    configId: text("config_id").default("default").notNull(),
    name: text(),
    start: text(),
    referenceId: text("reference_id").notNull(),
    prefix: text(),
    key: text().notNull(),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at"),
    enabled: boolean().default(true),
    rateLimitEnabled: boolean("rate_limit_enabled").default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").default(0),
    remaining: integer(),
    lastRequest: timestamp("last_request"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    permissions: text(),
    metadata: text(),
  },
  (table) => [
    index("apikey_configId_idx").using(
      "btree",
      table.configId.asc().nullsLast()
    ),
    index("apikey_key_idx").using("btree", table.key.asc().nullsLast()),
    index("apikey_referenceId_idx").using(
      "btree",
      table.referenceId.asc().nullsLast()
    ),
  ]
)
