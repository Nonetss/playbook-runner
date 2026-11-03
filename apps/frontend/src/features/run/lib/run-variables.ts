/** The variable rows of the run page and the job form, as pure data. */

export type SecretVariable = {
  name: string
  secretName: string
  secretPath: string
}

export type RunVariableRow = {
  id: string
  name: string
  kind: "text" | "secret"
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
    value: "",
    secretName: "",
    secretPath: "/",
    ...fields,
  }
}

/** Rows for what a job stored: its extra vars and its own secret variables. */
export function rowsFromSaved(
  extravars: Record<string, string> | null | undefined,
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
      newVariableRow({ name, value })
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
 * secret row with no secret is reported, since dropping it would run without it.
 */
export function toRunVariables(rows: RunVariableRow[]): {
  extravars: Record<string, string>
  secretVariables: SecretVariable[]
  incomplete: string[]
} {
  const named = rows
    .map((row) => ({ ...row, name: row.name.trim() }))
    .filter((row) => row.name)
  const secrets = named.filter((row) => row.kind === "secret")
  return {
    extravars: Object.fromEntries(
      named
        .filter((row) => row.kind === "text")
        .map((row) => [row.name, row.value])
    ),
    secretVariables: secrets
      .filter((row) => row.secretName)
      .map((row) => ({
        name: row.name,
        secretName: row.secretName,
        secretPath: row.secretPath.trim() || "/",
      })),
    incomplete: secrets.filter((row) => !row.secretName).map((row) => row.name),
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
