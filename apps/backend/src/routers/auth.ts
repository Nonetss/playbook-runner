import { auth } from "@playbook-runner/auth"
import { Hono } from "hono"

const router = new Hono()

router.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

export default router
