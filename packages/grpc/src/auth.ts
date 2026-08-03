import * as grpc from "@grpc/grpc-js"
import { logger } from "@playbook-runner/logger"

/**
 * Mirrors `TokenAuthInterceptor` in `python/grpc-toolkit`: the same shared
 * `SERVICE_TOKEN` bearer check, read from gRPC metadata instead of an HTTP
 * header. A rejected call never reaches the handler.
 */
export function tokenAuthInterceptor(
  expectedToken: string
): grpc.ServerInterceptor {
  return (methodDescriptor, call) =>
    new grpc.ServerInterceptingCall(call, {
      start(next) {
        next({
          onReceiveMetadata(metadata, mdNext) {
            if (metadata.get("authorization")[0] !== expectedToken) {
              logger.warn(
                { method: methodDescriptor.path },
                "grpc call rejected (invalid token)"
              )
              call.sendStatus({
                code: grpc.status.UNAUTHENTICATED,
                details: "Invalid or missing token",
              })
              return
            }
            mdNext(metadata)
          },
        })
      },
    })
}

/**
 * Metadata every outgoing call must carry. The Python interceptor compares the
 * raw token — no `Bearer ` prefix, unlike the HTTP side.
 */
export function authMetadata(token: string): grpc.Metadata {
  const metadata = new grpc.Metadata()
  metadata.set("authorization", token)
  return metadata
}
