import z from "zod"

const uuid = z.string().uuid()
const playbook = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  content: z.string().min(1),
  folderId: uuid.nullable().optional(),
})
const folder = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
})

export const playbooksInput = {
  playbook,
  folder,
  id: z.object({ id: z.string() }),
  folderId: z.object({ folderId: uuid.nullable() }),
  move: z.object({ id: uuid, folderId: uuid.nullable() }),
}
