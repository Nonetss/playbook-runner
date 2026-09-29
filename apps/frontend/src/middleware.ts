import { defineMiddleware } from "astro:middleware"
import { authServer } from "@/lib/auth-server"
import { LOCALE_COOKIE } from "@/lib/i18n/config"
import { resolveLocaleFromHeaders } from "@/lib/i18n/resolve"

const publicPaths = [
  "/login",
  "/scalar",
  "/openapi.json",
  // PWA: the browser fetches these without cookies (manifest) or before login.
  "/manifest.webmanifest",
  "/sw.js",
  "/pwa",
]
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Paths that never need an auth check. Anything matching is forwarded as-is
// (next()) so the Astro adapter / Caddy can serve it (or 404) without a
// session lookup or /login redirect.

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  const cookieHeader = context.request.headers.get("cookie")

  const locale = resolveLocaleFromHeaders(
    cookieHeader,
    context.request.headers.get("accept-language")
  )
  context.locals.locale = locale

  // When the visitor has no explicit `locale` cookie yet, persist the resolved
  // locale on the response. This makes the client-side islands (which read the
  // cookie) agree with the server-rendered `<html lang>` on the very first
  // visit, instead of falling back to `navigator.language`.
  const hasLocaleCookie = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=`).test(
    cookieHeader ?? ""
  )
  const withLocaleCookie = (response: Response) => {
    if (!hasLocaleCookie) {
      response.headers.append(
        "set-cookie",
        `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
      )
    }
    return response
  }

  // Exact match or a nested path: `/login-foo` must not count as `/login`.
  const isPublic = publicPaths.some(
    (p) => path === p || path.startsWith(`${p}/`)
  )
  // Every public path except the login page skips the session lookup.
  if (isPublic && path !== "/login") {
    return withLocaleCookie(await next())
  }

  let refreshedCookie: string | null = null

  // A backend outage must not break the login page, so a failed lookup
  // counts as "no session".
  const sessionResult = await authServer
    .getSession({
      fetchOptions: {
        headers: Object.fromEntries(context.request.headers.entries()),
        onSuccess: (ctx) => {
          refreshedCookie = ctx.response.headers.get("set-cookie")
        },
      },
    })
    .catch(() => ({ data: null, error: new Error("session lookup failed") }))

  const hasSession = !sessionResult.error && sessionResult.data !== null

  if (path === "/login") {
    // Signed-in users have nothing to do on the login page.
    return hasSession ? context.redirect("/") : withLocaleCookie(await next())
  }

  if (!hasSession || !sessionResult.data) {
    return context.redirect("/login")
  }

  const { user, session } = sessionResult.data

  context.locals.session = session
  context.locals.user = user

  // Mirrors the API's access rules: `pending` accounts may only see their
  // profile, and admin pages require the `admin` role.
  if (user.role === "pending" && path !== "/me") {
    return context.redirect("/me")
  }
  if (path.startsWith("/admin") && user.role !== "admin") {
    return context.redirect("/")
  }

  const response = await next()

  if (refreshedCookie) {
    response.headers.append("set-cookie", refreshedCookie)
  }

  return withLocaleCookie(response)
})
