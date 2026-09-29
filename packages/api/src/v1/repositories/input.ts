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

const repository = z.object({
  name: z.string().trim().min(1),
  url,
  branch: branch.default("main"),
  subdir: subdir.nullish(),
  credentialId: idSchema.nullish(),
})

export const repositoriesInput = {
  create: repository,
  get: byId,
  update: repository.extend({ id: idSchema }),
  delete: byId,
  sync: byId,
  playbooks: byId,
}
