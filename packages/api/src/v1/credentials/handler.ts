import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import { asc, eq } from "drizzle-orm"
import type z from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import { encryptSecret } from "#v1/credentials/crypto"
import type { credentialsInput } from "#v1/credentials/input"
import { generateEd25519KeyPair } from "#v1/credentials/ssh-key"

// Explicit columns so the (encrypted) private key never reaches the router.
const publicColumns = {
  id: credentials.id,
  name: credentials.name,
  username: credentials.username,
  publicKey: credentials.publicKey,
  createdAt: credentials.createdAt,
  updatedAt: credentials.updatedAt,
}

export const credentialsHandler = {
  generate: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof credentialsInput.generate>
  }) => generateEd25519KeyPair(input.comment ?? ""),

  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof credentialsInput.create>
  }) => {
    const [row] = await db
      .insert(credentials)
      .values({
        name: input.name,
        username: input.username,
        publicKey: input.publicKey,
        privateKey: encryptSecret(input.privateKey),
      })
      .returning(publicColumns)
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return row
  },

  list: async (_: { context: Context; input?: unknown }) => {
    return db
      .select(publicColumns)
      .from(credentials)
      .orderBy(asc(credentials.createdAt))
  },

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof credentialsInput.get>
  }) => {
    const [row] = await db
      .select(publicColumns)
      .from(credentials)
      .where(eq(credentials.id, input.id))
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof credentialsInput.update>
  }) => {
    const [row] = await db
      .update(credentials)
      .set({
        name: input.name,
        username: input.username,
        ...(input.privateKey
          ? { privateKey: encryptSecret(input.privateKey) }
          : {}),
        ...(input.publicKey ? { publicKey: input.publicKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, input.id))
      .returning(publicColumns)
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof credentialsInput.delete>
  }) => {
    const [row] = await db
      .delete(credentials)
      .where(eq(credentials.id, input.id))
      .returning(publicColumns)
    if (!row) throw errors.NOT_FOUND()
    return row
  },
}
