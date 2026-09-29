import { auth } from "@playbook-runner/auth"
import { createDb } from "@playbook-runner/db"
import { user } from "@playbook-runner/db/schema/auth"
import { env } from "@playbook-runner/env/server"
import { logger } from "@playbook-runner/logger"
import { eq } from "drizzle-orm"

const DEFAULT_SEED_PASSWORD = "admin1234"

export async function seed() {
  logger.info("seeding database")

  const db = createDb()
  const email = env.SEED_ADMIN_EMAIL
  const password = env.SEED_ADMIN_PASSWORD
  const name = env.SEED_ADMIN_NAME

  const existing = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  if (existing.length > 0 && existing[0]) {
    logger.info({ userId: existing[0].id, email }, "seed user already exists")
    return
  }

  // Runs on every backend start, so refuse (without crashing) to create a
  // production admin with the publicly known default password.
  if (env.NODE_ENV === "production" && password === DEFAULT_SEED_PASSWORD) {
    logger.error(
      { email },
      "seed skipped: set SEED_ADMIN_PASSWORD to a non-default value to create the first admin"
    )
    return
  }

  // Public sign-up is disabled, so create the account through the admin API
  // (server-side call, no session required).
  await auth.api.createUser({
    body: { email, password, name, role: "admin" },
  })

  logger.info(
    { email },
    "created admin user; change its password after first login"
  )
}
