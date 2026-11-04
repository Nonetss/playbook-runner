import { encryptSecret } from "#v1/credentials/crypto"

/** Columns to write: nothing when omitted, so an update keeps the stored one. */
export function vaultPasswordColumn(password: string | null | undefined) {
  if (password === undefined) return {}
  return { vaultPassword: password === null ? null : encryptSecret(password) }
}

/** A repository row as the API returns it: whether it has one, never its value. */
export function hideVaultPassword<Row extends { vaultPassword: string | null }>(
  row: Row
) {
  const { vaultPassword, ...rest } = row
  return { ...rest, hasVaultPassword: vaultPassword !== null }
}
