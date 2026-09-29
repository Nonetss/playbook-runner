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
  missing: z.number().int(),
})

const branches = z.object({
  branches: z.array(z.string()),
  // Remote HEAD; null when the remote does not advertise it.
  defaultBranch: z.string().nullable(),
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
}
