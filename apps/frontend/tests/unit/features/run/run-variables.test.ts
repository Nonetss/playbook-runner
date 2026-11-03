import { describe, expect, test } from "bun:test"
import {
  newVariableRow,
  rowsFromSaved,
  setDeclaredSecret,
  suggestVariableName,
  toRunVariables,
  viewVariables,
} from "@/features/run/lib/run-variables"

const DECLARED = {
  name: "db_password",
  secretName: "DB_PASS",
  secretPath: "/",
}

describe("toRunVariables", () => {
  test("typed rows are extra vars and chosen secrets are secret variables", () => {
    expect(
      toRunVariables([
        newVariableRow({ name: " debug ", value: "true" }),
        newVariableRow({
          name: "token",
          kind: "secret",
          secretName: "API_TOKEN",
          secretPath: "/app",
        }),
      ])
    ).toEqual({
      extravars: { debug: "true" },
      secretVariables: [
        { name: "token", secretName: "API_TOKEN", secretPath: "/app" },
      ],
      incomplete: [],
    })
  })

  test("a chosen secret never travels as text, nor a typed value as a secret", () => {
    const { extravars, secretVariables } = toRunVariables([
      newVariableRow({
        name: "a",
        kind: "secret",
        value: "left over",
        secretName: "A",
      }),
      newVariableRow({ name: "b", value: "typed", secretName: "left over" }),
    ])

    expect(extravars).toEqual({ b: "typed" })
    expect(secretVariables.map((variable) => variable.name)).toEqual(["a"])
  })

  test("rows without a name are ignored", () => {
    expect(toRunVariables([newVariableRow({ value: "x" })])).toEqual({
      extravars: {},
      secretVariables: [],
      incomplete: [],
    })
  })

  test("a named secret row without a secret is reported", () => {
    const { secretVariables, incomplete } = toRunVariables([
      newVariableRow({ name: "token", kind: "secret" }),
    ])

    expect(secretVariables).toEqual([])
    expect(incomplete).toEqual(["token"])
  })

  test("an empty path falls back to the root", () => {
    const { secretVariables } = toRunVariables([
      newVariableRow({
        name: "a",
        kind: "secret",
        secretName: "A",
        secretPath: " ",
      }),
    ])

    expect(secretVariables[0]?.secretPath).toBe("/")
  })
})

describe("viewVariables", () => {
  test("declared variables show their own secret without an override", () => {
    expect(viewVariables([DECLARED], [])).toEqual({
      declared: [DECLARED],
      own: [],
    })
  })

  test("an override is shown once, in the declared row", () => {
    const rows = setDeclaredSecret([], DECLARED, "OTHER", "/x")

    expect(viewVariables([DECLARED], rows)).toEqual({
      declared: [
        { name: "db_password", secretName: "OTHER", secretPath: "/x" },
      ],
      own: [],
    })
  })

  test("a typed row with a declared name stays visible, so the API can refuse it", () => {
    const typed = newVariableRow({ name: "db_password", value: "x" })

    expect(viewVariables([DECLARED], [typed]).own).toEqual([typed])
  })

  test("a stored override of a variable no longer declared is an added one", () => {
    const rows = setDeclaredSecret([], DECLARED, "OTHER", "/")

    expect(viewVariables([], rows).own).toEqual(rows)
  })
})

describe("setDeclaredSecret", () => {
  test("going back to the declared secret removes the override", () => {
    const overridden = setDeclaredSecret([], DECLARED, "OTHER", "/")

    expect(setDeclaredSecret(overridden, DECLARED, "DB_PASS", "/")).toEqual([])
  })

  test("only the override is sent, not the declared variable", () => {
    const untouched = setDeclaredSecret([], DECLARED, "DB_PASS", "/")

    expect(toRunVariables(untouched).secretVariables).toEqual([])
    expect(
      toRunVariables(setDeclaredSecret([], DECLARED, "OTHER", "/"))
        .secretVariables
    ).toEqual([{ name: "db_password", secretName: "OTHER", secretPath: "/" }])
  })
})

describe("rowsFromSaved", () => {
  test("restores both kinds", () => {
    const rows = rowsFromSaved({ debug: "true" }, [
      { name: "token", secretName: "T", secretPath: "/" },
    ])

    expect(rows.map((row) => [row.name, row.kind])).toEqual([
      ["token", "secret"],
      ["debug", "text"],
    ])
  })

  test("handles a job with nothing stored", () => {
    expect(rowsFromSaved(null)).toEqual([])
  })
})

describe("suggestVariableName", () => {
  test.each([
    ["DB_PASSWORD", "db_password"],
    ["api-key.prod", "api_key_prod"],
    ["2FA_TOKEN", "_2fa_token"],
    ["ANSIBLE_PASS", "secret_ansible_pass"],
  ])("%s becomes %s", (secret, name) => {
    expect(suggestVariableName(secret)).toBe(name)
  })
})
