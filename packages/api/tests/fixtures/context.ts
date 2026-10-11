import type { Context } from "#context"

type User = NonNullable<Context["user"]>
type Session = NonNullable<Context["session"]>

const now = new Date("2026-01-01T00:00:00.000Z")

function user(role: string): User {
  return {
    id: `${role}-id`,
    name: `${role} name`,
    email: `${role}@example.com`,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
    role,
    banned: false,
    banReason: null,
    banExpires: null,
  }
}

function session(userId: string): Session {
  return {
    id: `${userId}-session`,
    userId,
    token: `${userId}-token`,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
    ipAddress: null,
    userAgent: null,
  }
}

function signedIn(role: string): Context {
  const signedInUser = user(role)
  return {
    user: signedInUser,
    session: session(signedInUser.id),
    headers: new Headers({ cookie: `session=${signedInUser.id}` }),
  }
}

export function anonymousContext(): Context {
  return { user: null, session: null, headers: new Headers() }
}

/** An account that exists but has not been granted access yet. */
export function pendingContext(): Context {
  return signedIn("pending")
}

export function userContext(): Context {
  return signedIn("user")
}

export function adminContext(): Context {
  return signedIn("admin")
}
