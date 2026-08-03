import type { Context } from "#context"

export const privateHandler = {
  async data({ context }: { context: Context }) {
    return { message: "This is private", user: context.user }
  },
}
