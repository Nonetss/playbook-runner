import { defineMiddleware } from "astro:middleware"
import { authServer } from "@/lib/auth-server"

const publicPaths = ["/login", "/signup", "/scalar", "/openapi.json"]

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname

  if (publicPaths.some((p) => path.startsWith(p))) {
    return next()
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

  return response
})
