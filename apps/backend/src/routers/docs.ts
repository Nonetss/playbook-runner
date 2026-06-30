import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins"
import { onError } from "@orpc/server"
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4"
import { createContext } from "@playbook-runner/api/context"
import { appRouter } from "@playbook-runner/api/routers/index"
import { Hono } from "hono"

const handler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      docsProvider: "scalar",
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsPath: "/scalar",
      specPath: "/openapi.json",
      specGenerateOptions: {
        servers: [{ url: "/api" }],
        info: { title: "API", version: "1.0.0" },
        security: [{ ApiKey: [] }, { BearerAuth: [] }],
        components: {
          securitySchemes: {
            ApiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
              description: "API key — pass your key in the x-api-key header",
            },
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              description: "Session token — pass your session token as Bearer",
            },
          },
        },
      },
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

const apiMiddleware: Parameters<typeof router.use>[1] = async (c, next) => {
  const context = await createContext({ context: c })
  const result = await handler.handle(c.req.raw, { prefix: "/api", context })
  if (result.matched)
    return c.newResponse(result.response.body, result.response)
  await next()
}

router.use("/api/*", apiMiddleware)

export default router
