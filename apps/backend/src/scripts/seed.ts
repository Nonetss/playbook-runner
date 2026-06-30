import { auth } from "@playbook-runner/auth"
import { createDb } from "@playbook-runner/db"
import { user } from "@playbook-runner/db/schema/auth"
import { env } from "@playbook-runner/env/server"
import { eq } from "drizzle-orm"

async function main() {
  console.log("Seeding database…")

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
    console.log(`✓ User already exists: ${email} (id=${existing[0].id})`)
    return
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  })

  console.log("")
  console.log("✓ Created admin user:")
  console.log(`    email:    ${email}`)
  console.log(`    password: ${password}`)
  console.log("")
  console.log("⚠ Change the password after first login.")
  console.log(
    "  Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env to override."
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed failed:", err)
    process.exit(1)
  })
