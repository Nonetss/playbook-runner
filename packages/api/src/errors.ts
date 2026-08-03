import type { ErrorMap } from "@orpc/server"
import { createORPCErrorConstructorMap } from "@orpc/server"

export const errorMap = {
  BAD_REQUEST: { status: 400, message: "Bad Request" },
  UNAUTHORIZED: { status: 401, message: "Unauthorized" },
  FORBIDDEN: { status: 403, message: "Forbidden" },
  NOT_FOUND: { status: 404, message: "Not Found" },
  METHOD_NOT_SUPPORTED: { status: 405, message: "Method Not Supported" },
  NOT_ACCEPTABLE: { status: 406, message: "Not Acceptable" },
  TIMEOUT: { status: 408, message: "Request Timeout" },
  CONFLICT: { status: 409, message: "Conflict" },
  PRECONDITION_FAILED: { status: 412, message: "Precondition Failed" },
  PAYLOAD_TOO_LARGE: { status: 413, message: "Payload Too Large" },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "Unsupported Media Type" },
  UNPROCESSABLE_CONTENT: { status: 422, message: "Unprocessable Content" },
  TOO_MANY_REQUESTS: { status: 429, message: "Too Many Requests" },
  CLIENT_CLOSED_REQUEST: { status: 499, message: "Client Closed Request" },
  INTERNAL_SERVER_ERROR: { status: 500, message: "Internal Server Error" },
  NOT_IMPLEMENTED: { status: 501, message: "Not Implemented" },
  BAD_GATEWAY: { status: 502, message: "Bad Gateway" },
  SERVICE_UNAVAILABLE: { status: 503, message: "Service Unavailable" },
  GATEWAY_TIMEOUT: { status: 504, message: "Gateway Timeout" },
} as const satisfies ErrorMap

export const errors = createORPCErrorConstructorMap(errorMap)
