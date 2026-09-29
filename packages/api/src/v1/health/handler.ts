import type { Context } from "#context"

export const healthHandler = {
  check: async (_: { context: Context }) => "OK" as const,
}
