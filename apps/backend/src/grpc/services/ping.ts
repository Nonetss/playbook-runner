import type { PingServiceServer } from "@playbook-runner/grpc/stubs"
import { logger } from "@playbook-runner/logger"

const SERVICE_NAME = "backend"

/** Mirrors `PingServicer` in `apps/ansible/app/grpc/services/ping.py`. */
export const pingServicer: PingServiceServer = {
  ping(call, callback) {
    logger.info(
      { peer: call.getPeer(), message: call.request.message },
      "grpc Ping received"
    )
    callback(null, {
      message: `pong: ${call.request.message}`,
      from_service: SERVICE_NAME,
    })
  },
}
