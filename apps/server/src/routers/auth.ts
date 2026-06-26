import { auth } from "@none.stack/auth"
import { Hono } from "hono"

const router = new Hono()

router.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

export default router
