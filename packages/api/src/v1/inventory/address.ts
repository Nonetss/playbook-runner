/**
 * A device is one host, so only its address matters: "10.0.0.10/32" and even
 * "10.0.0.0/24" (rows stored before `ip_address` became `inet`, or inputs from
 * older clients) connect to the part before the slash.
 */
export function hostAddress(value: string): string {
  const slash = value.indexOf("/")
  return slash === -1 ? value : value.slice(0, slash)
}

const HOSTNAME_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/

/**
 * A DNS name the runner can resolve: dot-separated labels of letters, digits
 * and hyphens (RFC 1123), at most 253 characters, with an optional trailing
 * dot. The last label cannot be all digits, so a malformed IPv4 such as
 * "10.0.0.256" or "1.2" is not accepted as if it were a name.
 */
export function isHostname(value: string): boolean {
  const name = value.endsWith(".") ? value.slice(0, -1) : value
  if (name.length === 0 || name.length > 253) return false
  const labels = name.split(".")
  if (!labels.every((label) => HOSTNAME_LABEL.test(label))) return false
  return !/^\d+$/.test(labels[labels.length - 1] ?? "")
}
