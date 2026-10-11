import { beforeEach, describe, expect, test } from "bun:test"
import { anonymousContext } from "#tests/fixtures/context"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { authConfigHandler } from "#v1/auth-config/handler"

const context = anonymousContext()

function configureSso() {
  testEnv.GENERIC_OAUTH_CLIENT_ID = "client"
  testEnv.GENERIC_OAUTH_CLIENT_SECRET = "secret"
  testEnv.GENERIC_OAUTH_ISSUER = "https://sso.example.com"
}

beforeEach(() => resetEnv())

describe("authConfig.get", () => {
  test("SSO is off when the OAuth trio is not configured", async () => {
    expect(await authConfigHandler.get({ context })).toEqual({
      ssoEnabled: false,
    })
  })

  test("SSO is on when the client id, secret and issuer are all set", async () => {
    configureSso()

    expect(await authConfigHandler.get({ context })).toEqual({
      ssoEnabled: true,
    })
  })

  test("SSO stays off when any one of the three is missing", async () => {
    configureSso()
    testEnv.GENERIC_OAUTH_ISSUER = undefined

    expect(await authConfigHandler.get({ context })).toEqual({
      ssoEnabled: false,
    })
  })
})
