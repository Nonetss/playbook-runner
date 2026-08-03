import { auth } from "@playbook-runner/auth"
import type { Context } from "#context"

export const configHandler = {
  async listApiKeys({ context }: { context: Context }) {
    const result = await auth.api.listApiKeys({ headers: context.headers })
    return result?.apiKeys ?? []
  },

  async createApiKey({
    context,
    input,
  }: {
    context: Context
    input: { name?: string; expiresIn?: number }
  }) {
    return auth.api.createApiKey({
      headers: context.headers,
      body: {
        configId: "default",
        name: input.name,
        ...(input.expiresIn ? { expiresIn: input.expiresIn } : {}),
      },
    })
  },

  async deleteApiKey({
    context,
    input,
  }: {
    context: Context
    input: { id: string }
  }) {
    const result = await auth.api.deleteApiKey({
      headers: context.headers,
      body: { keyId: input.id },
    })
    return { id: input.id, success: !!result?.success }
  },
}
