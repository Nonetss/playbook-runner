import { credentials } from "@playbook-runner/db/schema/credentials"
import { decryptSecret } from "#v1/credentials/crypto"

/** Columns a Git operation needs from a (left-joined) credential. */
export const gitAuthColumns = {
  credentialUsername: credentials.username,
  privateKey: credentials.privateKey,
  token: credentials.token,
}

type GitAuthRow = {
  credentialUsername: string | null
  privateKey: string | null
  token: string | null
}

/**
 * What the runner gets to authenticate against a Git remote: the SSH key of
 * an SSH credential, or the username and token of a token credential. Nothing
 * when the repository has no credential. Decrypted only here, right before it
 * is sent over gRPC.
 */
export function gitAuth(row: GitAuthRow) {
  if (row.privateKey) return { private_key: decryptSecret(row.privateKey) }
  if (row.token) {
    return {
      token: {
        username: row.credentialUsername ?? "",
        token: decryptSecret(row.token),
      },
    }
  }
  return {}
}
