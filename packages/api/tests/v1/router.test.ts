import { beforeEach, describe, expect, test } from "bun:test"
import { type AnyProcedure, call, isProcedure, ORPCError } from "@orpc/server"
import { anonymousContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv } from "#tests/fixtures/env"
import { resetGrpc } from "#tests/fixtures/grpc"
import { appRouter as v1Router } from "#v1/router"

/**
 * The procedures an anonymous caller may reach. This list is a security
 * contract: it changes only when an endpoint is deliberately made public.
 */
const PUBLIC_PROCEDURES = ["authConfig.get", "health.check"]

function procedures(
  router: object,
  prefix: string[] = []
): [string, AnyProcedure][] {
  return Object.entries(router).flatMap(([key, value]) => {
    const path = [...prefix, key]
    if (isProcedure(value)) return [[path.join("."), value]]
    if (typeof value === "object" && value !== null) {
      return procedures(value, path)
    }
    return []
  })
}

const ALL = procedures(v1Router)

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

describe("v1 router", () => {
  test("exposes procedures to sweep", () => {
    expect(ALL.length).toBeGreaterThan(PUBLIC_PROCEDURES.length)
  })

  test("only the declared public procedures accept an anonymous caller", async () => {
    const reachable: string[] = []
    for (const [path, procedure] of ALL) {
      const outcome = await call(
        procedure,
        {},
        {
          context: anonymousContext(),
        }
      ).then(
        () => undefined,
        (error: unknown) => error
      )
      const unauthorized =
        outcome instanceof ORPCError && outcome.code === "UNAUTHORIZED"
      if (!unauthorized) reachable.push(path)
    }

    expect(reachable.sort()).toEqual(PUBLIC_PROCEDURES)
  })

  test("an anonymous caller is never let into the database", async () => {
    for (const [path, procedure] of ALL) {
      if (PUBLIC_PROCEDURES.includes(path)) continue
      await call(procedure, {}, { context: anonymousContext() }).catch(
        () => undefined
      )
    }

    expect(fakeDb.calls()).toEqual([])
  })

  test("the health check answers OK", async () => {
    const health = v1Router.health.check
    expect(await call(health, undefined, { context: anonymousContext() })).toBe(
      "OK"
    )
  })

  test("the auth configuration reports SSO off without the OAuth trio", async () => {
    const authConfig = v1Router.authConfig.get
    expect(
      await call(authConfig, undefined, { context: anonymousContext() })
    ).toEqual({ ssoEnabled: false })
  })
})
