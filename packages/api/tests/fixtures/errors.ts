import { expect } from "bun:test"
import { ORPCError } from "@orpc/server"

/** Asserts that `promise` rejects with an `ORPCError` of `code`. */
export async function expectErrorCode(
  promise: Promise<unknown>,
  code: string
): Promise<ORPCError<string, unknown> | undefined> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown
  )
  expect(error).toBeInstanceOf(ORPCError)
  if (!(error instanceof ORPCError)) return undefined
  expect(error.code).toBe(code)
  return error
}
