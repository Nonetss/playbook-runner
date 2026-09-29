import { ORPCError, ValidationError } from "@orpc/server"

function formatIssues(error: ValidationError) {
  return error.issues
    .map((issue) => {
      const path = issue.path
        ?.map((segment) =>
          typeof segment === "object" ? String(segment.key) : String(segment)
        )
        .join(".")
      // Record key failures nest the key schema's own message.
      const nested = (issue as { issues?: { message?: string }[] }).issues
      const message = nested?.[0]?.message ?? issue.message
      return path ? `${path}: ${message}` : message
    })
    .join("; ")
}

/**
 * oRPC reports bad input as a generic "Input validation failed". Put the
 * schema messages (e.g. reserved extra vars, invalid names) in the message so
 * the UI's error toasts show why the request was rejected.
 */
export async function inputValidationMessages({
  next,
}: {
  next: () => Promise<unknown>
}) {
  try {
    return await next()
  } catch (error) {
    if (
      error instanceof ORPCError &&
      error.code === "BAD_REQUEST" &&
      error.cause instanceof ValidationError
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: formatIssues(error.cause),
        data: error.data,
        cause: error.cause,
      })
    }
    throw error
  }
}
