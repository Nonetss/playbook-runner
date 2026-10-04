/** How many recently visited surfaces the navbar search remembers. */
export const RECENT_SURFACES_LIMIT = 5

const STORAGE_PREFIX = "recent-surfaces:"

/**
 * Local-storage list of the surface paths a user visited most recently,
 * newest first, scoped per user so shared browsers don't mix histories.
 * Read and write failures (private mode, quota, malformed JSON) degrade to
 * an empty list instead of throwing.
 */
export function readRecentSurfaces(userId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((href): href is string => typeof href === "string")
      .slice(0, RECENT_SURFACES_LIMIT)
  } catch {
    return []
  }
}

/** Moves `href` to the front of the user's recent list and returns the new list. */
export function recordRecentSurface(userId: string, href: string): string[] {
  const next = [
    href,
    ...readRecentSurfaces(userId).filter((item) => item !== href),
  ].slice(0, RECENT_SURFACES_LIMIT)
  if (typeof window === "undefined") return next
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(next))
  } catch {
    // Ignore quota / private-mode failures.
  }
  return next
}
