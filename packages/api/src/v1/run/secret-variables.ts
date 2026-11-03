import { z } from "zod"
import { extravarName } from "#v1/run/extravars"

export const infisicalEnvironment = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Environments contain only letters, digits, `-` and `_`"
  )

const secretVariable = z.object({
  name: extravarName,
  secretName: z.string().trim().min(1),
  secretPath: z.string().trim().startsWith("/").default("/"),
})

export const secretVariables = z
  .array(secretVariable)
  .superRefine((variables, ctx) => {
    const seen = new Set<string>()
    for (const { name } of variables) {
      if (seen.has(name)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate secret variable "${name}"`,
        })
      }
      seen.add(name)
    }
  })

export const secretVariableOutput = z.object({
  name: z.string(),
  secretName: z.string(),
  secretPath: z.string(),
})

export type SecretVariable = z.infer<typeof secretVariableOutput>

export function toSecretVariable(row: {
  variableName: string
  secretName: string
  secretPath: string
}): SecretVariable {
  return {
    name: row.variableName,
    secretName: row.secretName,
    secretPath: row.secretPath,
  }
}

/** The playbook's variables plus a run's or job's, which win by name. */
export function mergeSecretVariables(
  declared: SecretVariable[],
  own: SecretVariable[] = []
): SecretVariable[] {
  const byName = new Map(declared.map((variable) => [variable.name, variable]))
  for (const variable of own) byName.set(variable.name, variable)
  return [...byName.values()]
}
