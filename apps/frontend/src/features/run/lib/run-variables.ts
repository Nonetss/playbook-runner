/** The variable rows of the run page and the job form, as pure data. */

export type SecretVariable = {
  name: string
  secretName: string
  secretPath: string
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type ExtraVars = Record<string, JsonValue>

/** How a row's text travels: Ansible tells `true` from `"true"`. */
export type VariableValueType = "text" | "boolean" | "number" | "json"

export type RunVariableRow = {
  id: string
  name: string
  kind: "text" | "secret"
  valueType: VariableValueType
  value: string
  secretName: string
  secretPath: string
}

let lastRowId = 0

export function newVariableRow(
  fields: Partial<Omit<RunVariableRow, "id">> = {}
): RunVariableRow {
  lastRowId += 1
  return {
    id: `variable-${lastRowId}`,
    name: "",
    kind: "text",
    valueType: "text",
    value: "",
    secretName: "",
    secretPath: "/",
    ...fields,
  }
}

/** A stored value as what its row edits. */
function savedValue(value: JsonValue): {
  value: string
  valueType: VariableValueType
} {
  if (typeof value === "string") return { value, valueType: "text" }
  if (typeof value === "boolean") {
    return { value: String(value), valueType: "boolean" }
  }
  if (typeof value === "number") {
    return { value: String(value), valueType: "number" }
  }
  return { value: JSON.stringify(value), valueType: "json" }
}

/** Parses a row's text; `undefined` when it does not fit the row's type. */
export function parseRowValue({
  value,
  valueType,
}: Pick<RunVariableRow, "value" | "valueType">): JsonValue | undefined {
  if (valueType === "text") return value
  const text = value.trim()
  if (valueType === "boolean") {
    return text === "true" ? true : text === "false" ? false : undefined
  }
  if (text === "") return undefined
  if (valueType === "number") {
    const number = Number(text)
    return Number.isFinite(number) ? number : undefined
  }
  try {
    return JSON.parse(text) as JsonValue
  } catch {
    return undefined
  }
}

/** Rows for what a job stored: its extra vars and its own secret variables. */
export function rowsFromSaved(
  extravars: ExtraVars | null | undefined,
  secretVariables: SecretVariable[] = []
): RunVariableRow[] {
  return [
    ...secretVariables.map((variable) =>
      newVariableRow({
        name: variable.name,
        kind: "secret",
        secretName: variable.secretName,
        secretPath: variable.secretPath,
      })
    ),
    ...Object.entries(extravars ?? {}).map(([name, value]) =>
      newVariableRow({ name, ...savedValue(value) })
    ),
  ]
}

/**
 * Splits the rows into the playbook's variables, each showing the secret a row
 * points it at, and the rest. A secret row named like a declared variable is
 * that variable's override, so it is shown once, in the declared row.
 */
export function viewVariables(
  declared: SecretVariable[],
  rows: RunVariableRow[]
): { declared: SecretVariable[]; own: RunVariableRow[] } {
  const overrides = new Map(
    rows.filter((row) => row.kind === "secret").map((row) => [row.name, row])
  )
  return {
    declared: declared.map((variable) => {
      const override = overrides.get(variable.name)
      return override
        ? {
            name: variable.name,
            secretName: override.secretName,
            secretPath: override.secretPath,
          }
        : variable
    }),
    own: rows.filter(
      (row) =>
        !(
          row.kind === "secret" &&
          declared.some((variable) => variable.name === row.name)
        )
    ),
  }
}

/** Points a declared variable at a secret; its own secret removes the override. */
export function setDeclaredSecret(
  rows: RunVariableRow[],
  declared: SecretVariable,
  secretName: string,
  secretPath: string
): RunVariableRow[] {
  const others = rows.filter(
    (row) => !(row.kind === "secret" && row.name === declared.name)
  )
  if (
    secretName === declared.secretName &&
    secretPath === declared.secretPath
  ) {
    return others
  }
  return [
    ...others,
    newVariableRow({
      name: declared.name,
      kind: "secret",
      secretName,
      secretPath,
    }),
  ]
}

/**
 * What a run or job sends. Rows without a name are ignored, as before; a named
 * secret row with no secret is reported, since dropping it would run without it,
 * and so is a value that does not fit its row's type.
 */
export function toRunVariables(rows: RunVariableRow[]): {
  extravars: ExtraVars
  secretVariables: SecretVariable[]
  incomplete: string[]
  invalid: string[]
} {
  const named = rows
    .map((row) => ({ ...row, name: row.name.trim() }))
    .filter((row) => row.name)
  const secrets = named.filter((row) => row.kind === "secret")
  const values = named
    .filter((row) => row.kind === "text")
    .map((row) => ({ name: row.name, value: parseRowValue(row) }))
  return {
    extravars: Object.fromEntries(
      values.flatMap(({ name, value }) =>
        value === undefined ? [] : [[name, value]]
      )
    ),
    secretVariables: secrets
      .filter((row) => row.secretName)
      .map((row) => ({
        name: row.name,
        secretName: row.secretName,
        secretPath: row.secretPath.trim() || "/",
      })),
    incomplete: secrets.filter((row) => !row.secretName).map((row) => row.name),
    invalid: values
      .filter(({ value }) => value === undefined)
      .map(({ name }) => name),
  }
}

/** A valid variable name for a secret: `DB-PASSWORD` becomes `db_password`. */
export function suggestVariableName(secretName: string): string {
  const name = secretName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^(?=\d)/, "_")
  return name.startsWith("ansible_") ? `secret_${name}` : name
}
