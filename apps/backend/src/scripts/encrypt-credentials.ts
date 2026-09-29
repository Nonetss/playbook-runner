/**
 * One-off data migration for SSH private keys at rest.
 *
 *   bun run credentials:encrypt              # encrypt legacy plaintext rows
 *   bun run credentials:encrypt --decrypt    # rollback: back to plaintext
 *
 * In the production image (only `dist/` is shipped):
 *   bun dist/encrypt-credentials.mjs [--decrypt]
 *
 * Idempotent and transactional. Requires CREDENTIALS_ENCRYPTION_KEY.
 */
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
} from "@playbook-runner/api/v1/credentials/crypto"
import { createDb } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import { logger } from "@playbook-runner/logger"
import { eq } from "drizzle-orm"

async function main() {
  const decrypt = process.argv.includes("--decrypt")
  const db = createDb()

  const changed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: credentials.id, privateKey: credentials.privateKey })
      .from(credentials)
    let count = 0
    for (const row of rows) {
      if (decrypt === !isEncrypted(row.privateKey)) continue
      const privateKey = decrypt
        ? decryptSecret(row.privateKey)
        : encryptSecret(row.privateKey)
      await tx
        .update(credentials)
        .set({ privateKey })
        .where(eq(credentials.id, row.id))
      count++
    }
    return count
  })

  logger.info(
    { changed, mode: decrypt ? "decrypt" : "encrypt" },
    "credentials private keys updated"
  )
  process.exit(0)
}

main().catch((err) => {
  logger.error({ err }, "credentials encryption failed")
  process.exit(1)
})
