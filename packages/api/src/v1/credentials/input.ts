import z from "zod"
import { idSchema } from "#v1/schemas"

const credential = z.object({
  name: z.string(),
  username: z.string(),
  privateKey: z.string(),
  publicKey: z.string(),
})

export const credentialsInput = {
  generate: z.object({ comment: z.string().optional() }),
  create: credential,
  get: z.object({ id: idSchema }),
  // Omitted keys keep the stored ones.
  update: credential.partial({ privateKey: true, publicKey: true }).extend({
    id: idSchema,
  }),
  delete: z.object({ id: idSchema }),
}
