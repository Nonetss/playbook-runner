import z from "zod"

const credential = z.object({
  name: z.string(),
  username: z.string(),
  privateKey: z.string(),
  publicKey: z.string(),
})

export const credentialsInput = {
  generate: z.object({ comment: z.string().optional() }),
  create: credential,
  get: z.object({ id: z.string() }),
  update: credential.extend({ id: z.string() }),
  remove: z.object({ id: z.string() }),
}
