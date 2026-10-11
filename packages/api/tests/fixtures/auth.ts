import type { auth } from "@playbook-runner/auth"

type ListedApiKeys = Awaited<ReturnType<typeof auth.api.listApiKeys>>
export type ListedApiKey = ListedApiKeys["apiKeys"][number]
export type CreatedApiKey = Awaited<ReturnType<typeof auth.api.createApiKey>>

const created = new Date("2026-01-01T10:00:00.000Z")

/** An API key as Better Auth's `listApiKeys` returns it. */
export function listedApiKey(
  overrides: Partial<ListedApiKey> = {}
): ListedApiKey {
  return {
    id: "key-1",
    configId: "default",
    name: "CI deploy",
    start: "pr_ab",
    prefix: "pr_",
    referenceId: "user-id",
    refillInterval: null,
    refillAmount: null,
    lastRefillAt: null,
    enabled: true,
    rateLimitEnabled: false,
    rateLimitTimeWindow: null,
    rateLimitMax: null,
    requestCount: 0,
    remaining: null,
    lastRequest: null,
    expiresAt: null,
    createdAt: created,
    updatedAt: created,
    metadata: null,
    permissions: null,
    ...overrides,
  }
}

export function listedApiKeys(keys: ListedApiKey[]): ListedApiKeys {
  return {
    apiKeys: keys,
    total: keys.length,
    limit: undefined,
    offset: undefined,
  }
}

/** The body Better Auth's `createApiKey` returns: the listed shape + `key`. */
export function createdApiKey(
  overrides: Partial<CreatedApiKey> = {}
): CreatedApiKey {
  return { ...listedApiKey(), key: "pr_abcdef0123456789", ...overrides }
}
