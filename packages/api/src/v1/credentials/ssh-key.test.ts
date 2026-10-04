import { describe, expect, test } from "bun:test"
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto"
import { generateEd25519KeyPair } from "#v1/credentials/ssh-key"

const BEGIN = "-----BEGIN OPENSSH PRIVATE KEY-----"
const END = "-----END OPENSSH PRIVATE KEY-----"

/** Reads SSH wire-format strings (uint32 length + bytes) from `buf`. */
function reader(buf: Buffer) {
  let offset = 0
  return {
    bytes(n: number) {
      const out = buf.subarray(offset, offset + n)
      offset += n
      return out
    },
    string() {
      const length = buf.readUInt32BE(offset)
      offset += 4
      return this.bytes(length)
    },
    uint32() {
      const value = buf.readUInt32BE(offset)
      offset += 4
      return value
    },
  }
}

function privateKeyBody(pem: string) {
  const base64 = pem.replace(BEGIN, "").replace(END, "").replace(/\s/g, "")
  return Buffer.from(base64, "base64")
}

describe("generateEd25519KeyPair", () => {
  test("produces OpenSSH PEM armour wrapped at 70 columns", () => {
    const { privateKey } = generateEd25519KeyPair()
    const lines = privateKey.trimEnd().split("\n")
    expect(lines[0]).toBe(BEGIN)
    expect(lines.at(-1)).toBe(END)
    expect(privateKey.endsWith("\n")).toBe(true)
    const body = lines.slice(1, -1)
    for (const line of body.slice(0, -1)) expect(line).toHaveLength(70)
    expect(body.at(-1)?.length).toBeLessThanOrEqual(70)
  })

  test("formats the public key line with and without a comment", () => {
    expect(generateEd25519KeyPair().publicKey).toMatch(
      /^ssh-ed25519 [A-Za-z0-9+/]+=*$/
    )
    expect(generateEd25519KeyPair("me@host").publicKey).toMatch(
      /^ssh-ed25519 [A-Za-z0-9+/]+=* me@host$/
    )
  })

  test("embeds the same public key in the private key", () => {
    const { privateKey, publicKey } = generateEd25519KeyPair("c")
    const publicBlob = Buffer.from(publicKey.split(" ")[1] ?? "", "base64")

    const r = reader(privateKeyBody(privateKey))
    expect(r.bytes(15).toString()).toBe("openssh-key-v1\0")
    expect(r.string().toString()).toBe("none") // cipher
    expect(r.string().toString()).toBe("none") // kdf
    expect(r.string()).toHaveLength(0) // kdf options
    expect(r.uint32()).toBe(1)
    expect(r.string().equals(publicBlob)).toBe(true)

    const section = reader(r.string())
    expect(section.uint32()).toBe(section.uint32()) // checkints match
    expect(section.string().toString()).toBe("ssh-ed25519")
    const pub = section.string()
    const seedAndPub = section.string()
    expect(seedAndPub.subarray(32).equals(pub)).toBe(true)
    expect(section.string().toString()).toBe("c")

    // The seed really belongs to that public key: sign with one, verify
    // with the other (the PKCS8 prefix is fixed for ed25519).
    const pkcs8Prefix = Buffer.from("302e020100300506032b657004220420", "hex")
    const signer = createPrivateKey({
      key: Buffer.concat([pkcs8Prefix, seedAndPub.subarray(0, 32)]),
      format: "der",
      type: "pkcs8",
    })
    const verifier = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: pub.toString("base64url") },
      format: "jwk",
    })
    const message = Buffer.from("playbook-runner")
    expect(verify(null, message, verifier, sign(null, message, signer))).toBe(
      true
    )
  })

  test("the public key is a valid ed25519 key", () => {
    const { publicKey } = generateEd25519KeyPair()
    const blob = reader(Buffer.from(publicKey.split(" ")[1] ?? "", "base64"))
    expect(blob.string().toString()).toBe("ssh-ed25519")
    const raw = blob.string()
    expect(raw).toHaveLength(32)

    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") },
      format: "jwk",
    })
    expect(key.asymmetricKeyType).toBe("ed25519")
  })
})
