import { z } from "zod"

// Typed locally: the frontend type-checks this package's sources without the
// Bun globals, but the code only ever runs in the Bun backend.
type BunCron = { cron: { parse(pattern: string): unknown } }

/** True when Bun's cron parser accepts `pattern` (5-field or @-nickname). */
export function isValidCron(pattern: string): boolean {
  try {
    const bun = (globalThis as unknown as { Bun: BunCron }).Bun
    return bun.cron.parse(pattern) !== null
  } catch {
    return false
  }
}

/** Optional cron schedule for a job; null/empty means "manual only". */
export const cronExpression = z
  .string()
  .nullable()
  .optional()
  .refine((value) => !value?.trim() || isValidCron(value.trim()), {
    message: "Invalid cron expression",
  })

/** Upper bound for Ansible `forks` on any run. */
export const forks = z.number().int().min(1).max(50)
