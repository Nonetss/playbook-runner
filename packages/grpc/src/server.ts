import * as grpc from "@grpc/grpc-js"
import { logger } from "@playbook-runner/logger"

import { tokenAuthInterceptor } from "#auth"

/** Re-exported so consumers never import `@grpc/grpc-js` directly. */
export type GrpcServer = grpc.Server

/** gRPC status codes, for servicers that need to fail a call with a specific one. */
export const grpcStatus = grpc.status

/**
 * Builds a `ServiceError` a unary servicer can hand to its callback, e.g.
 * `callback(grpcError(grpcStatus.NOT_FOUND, "not found"))`.
 */
export function grpcError(
  code: grpc.status,
  message: string
): grpc.ServiceError {
  return Object.assign(new Error(message), {
    code,
    details: message,
    metadata: new grpc.Metadata(),
  })
}

export type StartGrpcServerOptions = {
  port: number
  token: string
  /** Registers every servicer on the server, like `_register` on the Python side. */
  register: (server: grpc.Server) => void
}

/**
 * TS counterpart of `grpc_toolkit.start_grpc_server`: one server per process,
 * token interceptor applied to every registered service.
 */
export async function startGrpcServer({
  port,
  token,
  register,
}: StartGrpcServerOptions): Promise<grpc.Server> {
  const server = new grpc.Server({
    interceptors: [tokenAuthInterceptor(token)],
  })
  register(server)

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error) => (error ? reject(error) : resolve())
    )
  })

  logger.info({ port }, "grpc server listening")
  return server
}

export async function stopGrpcServer(server: grpc.Server, graceMs = 1000) {
  const forced = setTimeout(() => server.forceShutdown(), graceMs)
  await new Promise<void>((resolve) => server.tryShutdown(() => resolve()))
  clearTimeout(forced)
}
