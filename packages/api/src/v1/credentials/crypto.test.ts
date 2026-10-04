import { describe, expect, test } from "bun:test"
import { createCipheriv, randomBytes } from "node:crypto"
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
} from "#v1/credentials/crypto"
import { generateEd25519KeyPair } from "#v1/credentials/ssh-key"

/** Flips one bit of a base64 segment, keeping it valid base64. */
function flip(segment: string) {
  const bytes = Buffer.from(segment, "base64")
  bytes[0] = (bytes[0] ?? 0) ^ 0x01
  return bytes.toString("base64")
}

function parts(stored: string) {
  const [iv = "", tag = "", ciphertext = ""] = stored.slice(3).split(":")
  return { iv, tag, ciphertext }
}

describe("encryptSecret / decryptSecret", () => {
  test.each([
    ["ascii", "hunter2"],
    ["unicode", "contraseña ñ 🔑"],
    ["empty", ""],
    ["multiline PEM", generateEd25519KeyPair("test").privateKey],
  ])("round-trips %s", (_, plaintext) => {
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext)
  })

  test("uses the v1:<iv>:<tag>:<ciphertext> format", () => {
    const stored = encryptSecret("secret")
    expect(stored.startsWith("v1:")).toBe(true)
    expect(stored.split(":")).toHaveLength(4)
    expect(stored).not.toContain("secret")
  })

  test("uses a random IV per encryption", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"))
  })

  test("isEncrypted only matches the v1: prefix", () => {
    expect(isEncrypted(encryptSecret("x"))).toBe(true)
    expect(isEncrypted("-----BEGIN OPENSSH PRIVATE KEY-----")).toBe(false)
  })

  test("returns legacy plaintext unchanged", () => {
    const legacy = "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n"
    expect(decryptSecret(legacy)).toBe(legacy)
  })

  test.each([
    "v1:",
    "v1:abc",
    "v1:abc:def",
  ])("rejects malformed value %p", (value) => {
    expect(() => decryptSecret(value)).toThrow()
  })

  test.each([
    "iv",
    "tag",
    "ciphertext",
  ] as const)("rejects an altered %s", (field) => {
    const original = parts(encryptSecret("do not tamper"))
    const altered = { ...original, [field]: flip(original[field]) }
    const stored = `v1:${altered.iv}:${altered.tag}:${altered.ciphertext}`
    expect(() => decryptSecret(stored)).toThrow()
  })

  test("rejects a value encrypted with another key", () => {
    const iv = randomBytes(12)
    const cipher = createCipheriv("aes-256-gcm", randomBytes(32), iv)
    const ciphertext = Buffer.concat([
      cipher.update("x", "utf8"),
      cipher.final(),
    ])
    const stored = `v1:${iv.toString("base64")}:${cipher
      .getAuthTag()
      .toString("base64")}:${ciphertext.toString("base64")}`
    expect(() => decryptSecret(stored)).toThrow()
  })
})
