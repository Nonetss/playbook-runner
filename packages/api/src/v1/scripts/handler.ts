import { db } from "@playbook-runner/db"
import { scripts } from "@playbook-runner/db/schema/scripts"
import { asc, eq } from "drizzle-orm"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { scriptsInput } from "#v1/scripts/input"

export const scriptsHandler = {
  create: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof scriptsInput.create>
  }) => {
    const [row] = await db.insert(scripts).values(input).returning()
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return row
  },

  list: async (_: { context: Context; input?: unknown }) => {
    return db.select().from(scripts).orderBy(asc(scripts.createdAt))
  },

  get: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof scriptsInput.get>
  }) => {
    const [row] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, input.id))
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  update: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof scriptsInput.update>
  }) => {
    const { id, ...values } = input
    const [row] = await db
      .update(scripts)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(scripts.id, id))
      .returning()
    if (!row) throw errors.NOT_FOUND()
    return row
  },

  delete: async ({
    input,
  }: {
    context: Context
    input: z.infer<typeof scriptsInput.delete>
  }) => {
    const [row] = await db
      .delete(scripts)
      .where(eq(scripts.id, input.id))
      .returning()
    if (!row) throw errors.NOT_FOUND()
    return row
  },
}
