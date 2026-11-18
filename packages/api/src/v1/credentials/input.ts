import z from "zod"
import { idSchema } from "#v1/schemas"

/** Username Git hosts accept with an access token when none is given. */
export const DEFAULT_TOKEN_USERNAME = "x-access-token"

const sshKey = z.object({
  // Clients from before tokens existed send no type or scope: an SSH key for
  // a host. A key can also identify the runner to a Git remote (deploy key).
  type: z.literal("ssh_key").default("ssh_key"),
  scope: z.enum(["host", "git"]).default("host"),
  name: z.string(),
  username: z.string(),
  privateKey: z.string(),
  publicKey: z.string(),
})

const token = z.object({
  type: z.literal("token"),
  // A token only authenticates Git over HTTPS, never a host.
  scope: z.literal("git").default("git"),
  name: z.string(),
  username: z.string().trim().min(1).default(DEFAULT_TOKEN_USERNAME),
  token: z.string().trim().min(1).max(4096),
})

export const credentialsInput = {
  generate: z.object({ comment: z.string().optional() }),
  create: z.union([sshKey, token]),
  get: z.object({ id: idSchema }),
  // Omitted secrets keep the stored ones. The type never changes, and a field
  // of the other type is rejected by the handler.
  update: z.object({
    id: idSchema,
    name: z.string(),
    username: z.string(),
    privateKey: z.string().optional(),
    publicKey: z.string().optional(),
    token: z.string().trim().min(1).max(4096).optional(),
  }),
  delete: z.object({ id: idSchema }),
}
