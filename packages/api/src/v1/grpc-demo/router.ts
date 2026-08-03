import { protectedProcedure } from "#index"
import { grpcDemoHandler } from "#v1/grpc-demo/handler"
import { grpcDemoInput } from "#v1/grpc-demo/input"
import { grpcDemoOutput } from "#v1/grpc-demo/output"

export const grpcDemoRouter = {
  ping: protectedProcedure
    .route({
      summary: "Ping the ansible service over gRPC",
      description:
        "Calls `PingService.Ping` on the ansible service over gRPC using the shared SERVICE_TOKEN, and returns its reply. Diagnostics endpoint: the counterpart of the ansible service's `GET /grpc-ping-backend`.",
      tags: ["System"],
      method: "POST",
    })
    .input(grpcDemoInput.ping)
    .output(grpcDemoOutput.ping)
    .handler(({ input }) => grpcDemoHandler.ping({ input })),
}
