import { os } from "@orpc/server"

import type { Context } from "#context"
import { errorMap, errors } from "#errors"

// `o` is the typed procedure builder; `os` is the namespace carrying the
// middleware helper.
const o = os.$context<Context>().errors(errorMap)

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
export const publicProcedure = o

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.user) {
    throw errors.UNAUTHORIZED()
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
export const protectedProcedure = publicProcedure.use(requireAuth)
