import { z } from "zod"
import { idSchema } from "#v1/schemas"

const playbook = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  folderId: idSchema.nullable(),
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

export type Playbook = z.infer<typeof playbook>
export type PlaybookFolder = z.infer<typeof folder>

export const playbooksOutput = {
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
