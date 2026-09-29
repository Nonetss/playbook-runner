import * as grpc from "@grpc/grpc-js"

/**
 * Metadata every outgoing call must carry. The Python interceptor compares the
 * raw token — no `Bearer ` prefix, unlike the HTTP side.
 */
export function authMetadata(token: string): grpc.Metadata {
  const metadata = new grpc.Metadata()
  metadata.set("authorization", token)
  return metadata
}
