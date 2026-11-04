/**
 * A device is one host, so only its address matters: "10.0.0.10/32" and even
 * "10.0.0.0/24" (rows stored before `ip_address` became `inet`, or inputs from
 * older clients) connect to the part before the slash.
 */
export function hostAddress(value: string): string {
  const slash = value.indexOf("/")
  return slash === -1 ? value : value.slice(0, slash)
}
