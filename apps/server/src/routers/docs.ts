import { createContext } from "@none.stack/api/context"
import { appRouter } from "@none.stack/api/routers/index"
import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins"
import { onError } from "@orpc/server"
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4"
import { Hono } from "hono"

const handler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      docsProvider: "scalar",
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsPath: "/scalar",
      specPath: "/openapi.json",
    }),
  ],
  interceptors: [onError((error) => console.error(error))],
})

const router = new Hono()

const docsMiddleware: Parameters<typeof router.use>[1] = async (c, next) => {
  const context = await createContext({ context: c })
  const result = await handler.handle(c.req.raw, { prefix: "/", context })
  if (result.matched)
    return c.newResponse(result.response.body, result.response)
  await next()
}

router.use("/scalar", docsMiddleware)
router.use("/scalar/*", docsMiddleware)
router.use("/openapi.json", docsMiddleware)

export default router
