import { z } from "zod"
import { idSchema } from "#v1/schemas"

const byId = z.object({ id: idSchema })

/** `https://…`, `ssh://…` or scp-like `user@host:path`; never local paths. */
const url = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^(https:\/\/|ssh:\/\/)\S+$/.test(value) ||
      /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:\S+$/.test(value),
    { message: "URL must be https://, ssh:// or user@host:path" }
  )

const branch = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^(?!-)(?!.*\.\.)[A-Za-z0-9._/-]+$/, { message: "Invalid branch" })

/** Relative directory to scan; empty means the repository root. */
const subdir = z
  .string()
  .trim()
  .max(512)
  .refine((value) => !value.split("/").includes(".."), {
    message: "Subdirectory must stay inside the repository",
  })
  .transform((value) => value.replace(/^\/+|\/+$/g, "") || null)

/**
 * Ansible strips a password file's content, so a password with surrounding
 * whitespace would be stored and then never decrypt anything.
 */
const vaultPassword = z
  .string()
  .min(1)
  .max(1024)
  .refine((value) => value === value.trim(), {
    message: "Vault password must not start or end with whitespace",
  })

const repository = z.object({
  name: z.string().trim().min(1),
  url,
  branch: branch.default("main"),
  subdir: subdir.nullish(),
  credentialId: idSchema.nullish(),
  // Omitted keeps the stored password, null removes it.
  vaultPassword: vaultPassword.nullish(),
})

export const repositoriesInput = {
  create: repository,
  get: byId,
  update: repository.extend({ id: idSchema }),
  delete: byId,
  sync: byId,
  // Branches of a remote before (or without) saving it as a repository.
  branches: z.object({ url, credentialId: idSchema.nullish() }),
  playbooks: byId,
  roles: byId,
}
