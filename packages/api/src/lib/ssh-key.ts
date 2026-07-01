import { generateKeyPairSync, randomBytes } from "node:crypto"

function uint32(n: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(n, 0)
  return buf
}

function sshString(data: Buffer): Buffer {
  return Buffer.concat([uint32(data.length), data])
}

/**
 * Generates a fresh ed25519 SSH key pair and encodes it in the same formats
 * OpenSSH produces (`ssh-keygen -t ed25519`): an unencrypted
 * "openssh-key-v1" private key and a `ssh-ed25519 <base64>` public key line.
 *
 * Node's `crypto` module has no OpenSSH export format, so the raw key
 * material is pulled out of the PKCS8/SPKI DER encodings (always
 * fixed-length for ed25519, since the algorithm has no parameters) and
 * repacked by hand per the OpenSSH PROTOCOL.key spec.
 */
export function generateEd25519KeyPair(comment = "") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519")

  const pkcs8 = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer
  const seed = pkcs8.subarray(pkcs8.length - 32)

  const spki = publicKey.export({ format: "der", type: "spki" }) as Buffer
  const pub = spki.subarray(spki.length - 32)

  const keyType = Buffer.from("ssh-ed25519")
  const publicBlob = Buffer.concat([sshString(keyType), sshString(pub)])

  const checkint = randomBytes(4)
  const privateSection = Buffer.concat([
    checkint,
    checkint,
    sshString(keyType),
    sshString(pub),
    sshString(Buffer.concat([seed, pub])),
    sshString(Buffer.from(comment)),
  ])

  const blockSize = 8
  const padLength =
    (blockSize - (privateSection.length % blockSize)) % blockSize
  const padding = Buffer.from(
    Array.from({ length: padLength }, (_, i) => i + 1)
  )
  const paddedPrivateSection = Buffer.concat([privateSection, padding])

  const body = Buffer.concat([
    Buffer.from("openssh-key-v1\0"),
    sshString(Buffer.from("none")), // cipher
    sshString(Buffer.from("none")), // kdf
    sshString(Buffer.alloc(0)), // kdf options
    uint32(1), // number of keys
    sshString(publicBlob),
    sshString(paddedPrivateSection),
  ])

  const base64Body = body.toString("base64")
  const wrapped = base64Body.match(/.{1,70}/g)?.join("\n") ?? base64Body

  const privateKeyPem = `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`
  const publicKeyLine = `ssh-ed25519 ${publicBlob.toString("base64")}${
    comment ? ` ${comment}` : ""
  }`

  return { privateKey: privateKeyPem, publicKey: publicKeyLine }
}
