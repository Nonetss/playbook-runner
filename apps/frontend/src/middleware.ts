import { defineMiddleware } from "astro:middleware"
import { authServer } from "@/lib/auth-server"
import { LOCALE_COOKIE } from "@/lib/i18n/config"
import { resolveLocaleFromHeaders } from "@/lib/i18n/resolve"

const publicPaths = ["/login", "/signup", "/scalar", "/openapi.json"]
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

  if (publicPaths.some((p) => path.startsWith(p))) {
    return withLocaleCookie(await next())
  }

  let refreshedCookie: string | null = null

  const sessionResult = await authServer.getSession({
    fetchOptions: {
      headers: Object.fromEntries(context.request.headers.entries()),
      onSuccess: (ctx) => {
        refreshedCookie = ctx.response.headers.get("set-cookie")
      },
    },
  })

  if (sessionResult.error || sessionResult.data === null) {
    return context.redirect("/login")
  }

  const { user, session } = sessionResult.data

  context.locals.session = session
  context.locals.user = user

  const response = await next()

  if (refreshedCookie) {
    response.headers.append("set-cookie", refreshedCookie)
  }

  return withLocaleCookie(response)
})
