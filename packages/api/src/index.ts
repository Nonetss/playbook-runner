import { ORPCError, os } from "@orpc/server"

import type { Context } from "#context"

// `o` is the typed procedure builder; `os` is the namespace carrying the
// middleware helper.
const o = os.$context<Context>()

/**
 * Base procedures for the public API.
 *
 * Every oRPC endpoint should follow the documentation standard documented in
 * `packages/api/README.md` ("API endpoint documentation standard"). In
 * particular:
 *
 * - Endpoints inherit the common errors declared here; they only add their
 *   own specifics (NOT_FOUND, BAD_REQUEST, CONFLICT, ...).
 * - Always declare a typed `.output(...)`, a `.route({ summary, description,
 *   tags, method })`, and only the error codes this endpoint can actually
 *   raise.
 */

// Errors common to every endpoint, regardless of auth.
export const publicProcedure = o.errors({
  INTERNAL_SERVER_ERROR: {
    message: "Internal server error",
    status: 500,
  },
})

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.user) {
    // Declared on `protectedProcedure` below — this throw resolves to the
    // declared `UNAUTHORIZED` error and produces a 401 response.
    throw new ORPCError("UNAUTHORIZED")
  }
  return next({
    context: {
      ...context,
      user: context.user,
      session: context.session,
    },
  })
})

// Errors common to every authenticated endpoint. Endpoints must NOT re-declare
// these in their own `.errors(...)`.
export const protectedProcedure = publicProcedure
  .errors({
    UNAUTHORIZED: {
      message: "Authentication required",
      status: 401,
    },
    FORBIDDEN: {
      message: "Not allowed",
      status: 403,
    },
  })
  .use(requireAuth)
