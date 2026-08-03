import { env } from "@playbook-runner/env/server"
import {
  getClient,
  grpcStatusName,
  isGrpcError,
  unary,
} from "@playbook-runner/grpc"
import { PingServiceClient } from "@playbook-runner/grpc/stubs"
import type { z } from "zod"

import { errors } from "#errors"
import type { grpcDemoInput } from "#v1/grpc-demo/input"

/**
 * SERVICE_TOKEN is optional: the backend boots without it, but every gRPC call
 * fails fast rather than dialling with no credentials.
 */
function requireServiceToken() {
  if (!env.SERVICE_TOKEN) {
    throw errors.SERVICE_UNAVAILABLE({
      message: "gRPC is not configured (SERVICE_TOKEN is missing)",
    })
  }
  return env.SERVICE_TOKEN
}

export const grpcDemoHandler = {
  ping: async ({ input }: { input: z.infer<typeof grpcDemoInput.ping> }) => {
    const token = requireServiceToken()
    const target = env.ANSIBLE_GRPC_TARGET
    const client = getClient(PingServiceClient, target)

    try {
      const reply = await unary(
        client.ping.bind(client),
        { message: input.message },
        { token }
      )
      return {
        message: reply.message,
        from_service: reply.from_service,
        target,
      }
    } catch (cause) {
      if (!isGrpcError(cause)) throw cause

      const status = grpcStatusName(cause)
      if (status === "UNAUTHENTICATED") {
        throw errors.BAD_GATEWAY({
          message: "ansible rejected the token (SERVICE_TOKEN mismatch)",
        })
      }
      throw errors.BAD_GATEWAY({
        message: `Could not reach ansible at ${target}: ${status}`,
      })
    }
  },
}
