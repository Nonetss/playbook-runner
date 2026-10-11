import { describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { protectedProcedure, publicProcedure } from "#index"
import {
  adminContext,
  anonymousContext,
  pendingContext,
  userContext,
} from "#tests/fixtures/context"
import { expectErrorCode } from "#tests/fixtures/errors"

const publicEcho = publicProcedure.handler(({ context }) => ({
  userId: context.user?.id ?? null,
}))

const protectedEcho = protectedProcedure.handler(({ context }) => ({
  userId: context.user.id,
}))

describe("publicProcedure", () => {
  test("lets an anonymous caller through", async () => {
    expect(
      await call(publicEcho, undefined, { context: anonymousContext() })
    ).toEqual({ userId: null })
  })
})

describe("protectedProcedure", () => {
  test("an anonymous caller is UNAUTHORIZED", async () => {
    await expectErrorCode(
      call(protectedEcho, undefined, { context: anonymousContext() }),
      "UNAUTHORIZED"
    )
  })

  test("a pending account is FORBIDDEN", async () => {
    await expectErrorCode(
      call(protectedEcho, undefined, { context: pendingContext() }),
      "FORBIDDEN"
    )
  })

  test("a user reaches the handler with their own user", async () => {
    expect(
      await call(protectedEcho, undefined, { context: userContext() })
    ).toEqual({ userId: "user-id" })
  })

  test("an admin reaches the handler", async () => {
    expect(
      await call(protectedEcho, undefined, { context: adminContext() })
    ).toEqual({ userId: "admin-id" })
  })
})
