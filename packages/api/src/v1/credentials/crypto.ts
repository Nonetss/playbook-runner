import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { env } from "@playbook-runner/env/server"

// Stored format: `v1:<iv b64>:<auth tag b64>:<ciphertext b64>` (AES-256-GCM).
const PREFIX = "v1:"
const ALGORITHM = "aes-256-gcm"

function key() {
  return Buffer.from(env.CREDENTIALS_ENCRYPTION_KEY, "base64")
}

export function isEncrypted(value: string) {
  return value.startsWith(PREFIX)
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`
}

/** Decrypts a stored secret. Values without the `v1:` prefix are legacy plaintext. */
export function decryptSecret(stored: string) {
  if (!isEncrypted(stored)) return stored
  const [iv, tag, ciphertext] = stored.slice(PREFIX.length).split(":")
  if (!iv || !tag || ciphertext === undefined) {
    throw new Error("Malformed encrypted secret")
  }
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
