import { env } from "@playbook-runner/env/server"
import {
  type GrpcServer,
  startGrpcServer as start,
} from "@playbook-runner/grpc"
import { PingServiceService } from "@playbook-runner/grpc/stubs"
import { logger } from "@playbook-runner/logger"
import { pingServicer } from "#grpc/services/ping"

/** ansible is 50051; the backend takes the next one. */
export const GRPC_PORT = 50052

function register(server: GrpcServer) {
  server.addService(PingServiceService, pingServicer)
}

/**
 * Starts the gRPC server, or returns null when SERVICE_TOKEN is unset — the
 * backend must still boot without it, with gRPC simply staying down.
 */
export async function startGrpcServer(): Promise<GrpcServer | null> {
  if (!env.SERVICE_TOKEN) {
    logger.warn("grpc server not started (SERVICE_TOKEN not set)")
    return null
  }

  return start({
    port: GRPC_PORT,
    token: env.SERVICE_TOKEN,
    register,
  })
}
