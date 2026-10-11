import { ORPCError } from "@orpc/client"

/**
 * Status codes the client builds from a proxy's own error response (the
 * gateway or Vite answering 502/503/504 while the backend is unreachable).
 * `jobs.runs.watch` itself never throws them.
 */
const PROXY_ERROR_CODES = new Set([
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
])

/** How many reattaches in a row the job run console tries before giving up. */
export const MAX_REATTACH_ATTEMPTS = 5

const REATTACH_DELAYS_MS = [1_000, 2_000, 4_000, 8_000]

/**
 * Whether a failed live watch lost its connection (network drop, stream cut,
 * proxy error) rather than being refused by the API: only the former is
 * worth reattaching to, since the run itself keeps going on the backend.
 */
export function isTransportError(error: unknown): boolean {
  if (!(error instanceof ORPCError)) return true
  return PROXY_ERROR_CODES.has(error.code)
}

/** Delay before reattach `attempt` (1-based): 1 s, 2 s, 4 s, then 8 s. */
export function reattachDelay(attempt: number): number {
  const index = Math.min(Math.max(attempt, 1), REATTACH_DELAYS_MS.length) - 1
  return REATTACH_DELAYS_MS[index] ?? 8_000
}
