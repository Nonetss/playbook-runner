import { z } from "zod"
import { infisicalEnvironment, secretVariables } from "#v1/run/secret-variables"
import { idSchema } from "#v1/schemas"

/** UI sentinels / empty values that mean "no folder" (root). */
function coerceFolderId(value: unknown) {
  if (value == null) return null
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (
    trimmed === "" ||
    trimmed === "__root__" ||
    trimmed === "__none__" ||
    trimmed === "null"
  ) {
    return null
  }
  return trimmed
}

const folderId = z.preprocess(coerceFolderId, idSchema.nullable())

const byId = z.object({ id: idSchema })

const playbook = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  content: z.string().min(1),
  folderId: folderId.optional(),
})

// Without a connection there is nothing to read from, so a declaration either
// clears everything or names what its variables need.
const secretVariablesDeclaration = z
  .object({
    id: idSchema,
    infisicalConnectionId: idSchema.nullable(),
    infisicalEnvironment: infisicalEnvironment.nullable(),
    variables: secretVariables,
  })
  .refine(
    (declaration) =>
      declaration.variables.length === 0 ||
      (declaration.infisicalConnectionId && declaration.infisicalEnvironment),
    "Secret variables need an Infisical connection and environment"
  )

const folder = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
})

export const playbooksInput = {
  secretVariables: {
    get: byId,
    set: secretVariablesDeclaration,
  },
  create: playbook,
  listByFolder: z.object({ folderId }),
  get: byId,
  variables: byId,
  update: playbook.extend({ id: idSchema }),
  move: z.object({ id: idSchema, folderId }),
  delete: byId,
  folders: {
    create: folder,
    get: byId,
    update: folder.extend({ id: idSchema }),
    delete: byId,
  },
}
