import z from "zod"

const uuid = z.string().uuid()

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

const folderId = z.preprocess(coerceFolderId, uuid.nullable())

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
  playbook,
  folder,
  id: z.object({ id: z.string() }),
  folderId: z.object({ folderId }),
  move: z.object({ id: uuid, folderId }),
}
