import { onError } from "@orpc/server"
import { RPCHandler } from "@orpc/server/fetch"
import { createContext } from "@playbook-runner/api/context"
import { appRouter } from "@playbook-runner/api/routers/index"
import { Hono } from "hono"

const handler = new RPCHandler(appRouter, {
  interceptors: [onError((error) => console.error(error))],
})

const router = new Hono()

router.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c })
  const result = await handler.handle(c.req.raw, { prefix: "/rpc", context })
  if (result.matched)
    return c.newResponse(result.response.body, result.response)
  await next()
})

export default router
