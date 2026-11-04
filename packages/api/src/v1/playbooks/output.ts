import { z } from "zod"
import { secretVariableOutput } from "#v1/run/secret-variables"
import { idSchema } from "#v1/schemas"

const playbook = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  folderId: idSchema.nullable(),
  // `git` playbooks come from a repository sync and are read-only.
  source: z.enum(["inline", "git"]),
  repositoryId: idSchema.nullable(),
  path: z.string().nullable(),
  missing: z.boolean(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const folder = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const secretVariablesDeclaration = z.object({
  infisicalConnectionId: idSchema.nullable(),
  infisicalEnvironment: z.string().nullable(),
  variables: z.array(secretVariableOutput),
})

export type Playbook = z.infer<typeof playbook>
export type PlaybookSecretVariables = z.infer<typeof secretVariablesDeclaration>
export type PlaybookFolder = z.infer<typeof folder>

export const playbooksOutput = {
  variables: z.object({
    variables: z.array(
      z.object({
        name: z.string(),
        // Null when it is not a plain value, or looks sensitive.
        value: z.string().nullable(),
        // Always null here: a single-file playbook has no roles.
        role: z.string().nullable(),
      })
    ),
  }),
  secretVariables: {
    get: secretVariablesDeclaration,
    set: secretVariablesDeclaration,
  },
  create: playbook,
  list: z.array(playbook),
  listByFolder: z.array(playbook),
  get: playbook,
  update: playbook,
  move: playbook,
  delete: playbook,
  folders: {
    create: folder,
    list: z.array(folder),
    get: folder,
    update: folder,
    delete: folder,
  },
}
