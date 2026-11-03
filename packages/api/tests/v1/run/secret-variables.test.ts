import { describe, expect, test } from "bun:test"
import {
  infisicalEnvironment,
  mergeSecretVariables,
  secretVariables,
} from "#v1/run/secret-variables"

const VARIABLE = { name: "db_password", secretName: "DB_PASSWORD" }

describe("secretVariables", () => {
  test("a path defaults to the root", () => {
    expect(secretVariables.parse([VARIABLE])).toEqual([
      { ...VARIABLE, secretPath: "/" },
    ])
  })

  test.each([
    ["ansible_host"],
    ["ANSIBLE_ssh_args"],
    ["1starts_with_digit"],
    ["has-dash"],
    [""],
  ])("refuses the variable name %j", (name) => {
    expect(secretVariables.safeParse([{ ...VARIABLE, name }]).success).toBe(
      false
    )
  })

  test("refuses duplicate names", () => {
    expect(secretVariables.safeParse([VARIABLE, VARIABLE]).success).toBe(false)
  })

  test("refuses an empty secret name and a relative path", () => {
    expect(
      secretVariables.safeParse([{ ...VARIABLE, secretName: " " }]).success
    ).toBe(false)
    expect(
      secretVariables.safeParse([{ ...VARIABLE, secretPath: "app" }]).success
    ).toBe(false)
  })
})

describe("infisicalEnvironment", () => {
  test.each(["dev", "prod-eu", "stage_2"])("accepts %j", (slug) => {
    expect(infisicalEnvironment.safeParse(slug).success).toBe(true)
  })

  test.each(["", "dev prod", "../x", "dev;rm"])("refuses %j", (slug) => {
    expect(infisicalEnvironment.safeParse(slug).success).toBe(false)
  })
})

describe("mergeSecretVariables", () => {
  const DECLARED = { name: "a", secretName: "A", secretPath: "/" }

  test("keeps declared variables without own ones", () => {
    expect(mergeSecretVariables([DECLARED])).toEqual([DECLARED])
  })

  test("own variables add to and replace declared ones by name", () => {
    const replaced = { name: "a", secretName: "OTHER", secretPath: "/x" }
    const added = { name: "b", secretName: "B", secretPath: "/" }

    expect(mergeSecretVariables([DECLARED], [replaced, added])).toEqual([
      replaced,
      added,
    ])
  })
})
