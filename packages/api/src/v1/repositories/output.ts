import { z } from "zod"
import { playbooksOutput } from "#v1/playbooks/output"
import { idSchema } from "#v1/schemas"

const repository = z.object({
  id: idSchema,
  name: z.string(),
  url: z.string(),
  branch: z.string(),
  subdir: z.string().nullable(),
  credentialId: idSchema.nullable(),
  // The Vault password itself is never returned.
  hasVaultPassword: z.boolean(),
  // Sync state: null until the first successful sync.
  lastCommitSha: z.string().nullable(),
  lastSyncedAt: z.coerce.date().nullable(),
  // Message of the last failed sync; cleared by a successful one.
  lastSyncError: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

const repositoryWithCount = repository.extend({
  playbookCount: z.number().int(),
})

const syncResult = z.object({
  repository,
  added: z.number().int(),
  updated: z.number().int(),
  // Gone upstream but kept because a job uses them.
  missing: z.number().int(),
  // Gone upstream and deleted.
  removed: z.number().int(),
})

const branches = z.object({
  branches: z.array(z.string()),
  // Remote HEAD; null when the remote does not advertise it.
  defaultBranch: z.string().nullable(),
})

const roles = z.object({
  // Commit the roles were read from; null until the first successful sync.
  commit: z.string().nullable(),
  roles: z.array(
    z.object({
      name: z.string(),
      // Relative to the repository root.
      path: z.string(),
      description: z.string().nullable(),
    })
  ),
  // `requirements.yml` files found; their dependencies are not installed.
  requirementsFiles: z.array(z.string()),
  // Roles each playbook declares; only those declaring some are listed.
  playbookRoles: z.array(
    z.object({
      path: z.string(),
      roles: z.array(z.string()),
      // It also uses a role whose name is only known when it runs.
      dynamic: z.boolean(),
    })
  ),
  // Variables each playbook defines; only those defining some are listed.
  playbookVariables: z.array(
    z.object({
      path: z.string(),
      variables: z.array(
        z.object({
          name: z.string(),
          // Null when it is not a plain value, or looks sensitive.
          value: z.string().nullable(),
          // Null when the play defines it.
          role: z.string().nullable(),
          // The role reads it and nothing the playbook declares defines it.
          usedOnly: z.boolean(),
        })
      ),
    })
  ),
})

export type PlaybookRepository = z.infer<typeof repository>
export type PlaybookRepositoryWithCount = z.infer<typeof repositoryWithCount>
export type RepositorySyncResult = z.infer<typeof syncResult>

export const repositoriesOutput = {
  create: repository,
  list: z.array(repositoryWithCount),
  get: repository,
  update: repository,
  delete: repository,
  sync: syncResult,
  branches,
  playbooks: playbooksOutput.list,
  roles,
}
