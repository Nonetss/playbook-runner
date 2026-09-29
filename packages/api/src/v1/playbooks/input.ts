import { z } from "zod"
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

const folder = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
})

export const playbooksInput = {
  create: playbook,
  listByFolder: z.object({ folderId }),
  get: byId,
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
