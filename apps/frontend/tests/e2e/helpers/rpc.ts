import { type APIRequestContext, expect } from "@playwright/test"

/**
 * Calls a v1 procedure as the signed-in user: the request shares the page's
 * cookies, and cookie-authenticated calls must send the oRPC CSRF header.
 */
export async function rpc<T>(
  request: APIRequestContext,
  path: string,
  json: unknown = {}
): Promise<T> {
  const response = await request.post(`/rpc/v1/${path}`, {
    headers: { "x-csrf-token": "orpc" },
    data: { json },
  })
  expect(
    response.ok(),
    `${path} answered ${response.status()}: ${await response.text()}`
  ).toBe(true)
  return ((await response.json()) as { json: T }).json
}

/** Like `rpc`, but returns the HTTP status instead of asserting success. */
export async function rpcStatus(
  request: APIRequestContext,
  path: string,
  json: unknown = {}
): Promise<number> {
  const response = await request.post(`/rpc/v1/${path}`, {
    headers: { "x-csrf-token": "orpc" },
    data: { json },
  })
  return response.status()
}
