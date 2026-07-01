# `@playbook-runner/api`

Public oRPC API surface for Playbook Runner. Routers live in `src/routers/`,
backed by handlers in `src/handlers/` and DB schemas from `@playbook-runner/db`.
The backend (`apps/backend`) serves the oRPC + OpenAPI routes generated from
`appRouter`.

## API endpoint documentation standard

Every procedure exposed by `appRouter` (`src/routers/index.ts`) MUST follow
the shape below. This drives the generated OpenAPI document served at
`/openapi.json` and rendered at `/scalar`.

### Required shape

```ts
myResourceRouter = {
  create: protectedProcedure
    .route({
      summary: "Create an X",                        // required, non-empty
      description:
        "Creates a new X for the authenticated user.", // required, non-empty
      tags: ["X"],                                    // required, ≥ 1 tag
      method: "POST",                                  // required
    })
    .input(z.object({ name: z.string() }))             // required when input exists
    .output(createdXSchema)                           // required, typed
    .errors({ NOT_FOUND: { ... } })                   // endpoint-specific only
    .handler(async ({ input }) => { /* ... */ }),
}
```

That is: **`.route({ summary, description, tags, method })` + `.input()` (when applicable) + `.output()` + endpoint-specific `.errors()`**, in that order.

### Common errors live on the base procedures

`publicProcedure` and `protectedProcedure` (in `src/index.ts`) declare the
errors common to all endpoints exactly once:

| Procedure          | Declared errors                                                   |
| ------------------ | ---------------------------------------------------------------- |
| `publicProcedure`  | `INTERNAL_SERVER_ERROR`                                           |
| `protectedProcedure` (on top of public) | `UNAUTHORIZED`, `FORBIDDEN`                       |

Endpoints **must not** re-declare these. They add only their own specifics
(`NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `PRECONDITION_FAILED`, ...).
`requireAuth`'s `throw new ORPCError("UNAUTHORIZED")` aligns with the declared
`UNAUTHORIZED` on `protectedProcedure`.

### `.output()` — typed response schema

Always declare a typed response with `.output(zodSchema)`. Reuse a single
resource-scoped schema (`credentialSchema`, `playbookSchema`, `deviceSchema`,
`groupSchema`, `jobSchema`, `jobRunSchema`, `scriptSchema`, ...) across the
`get` / `list` / `create` / `update` / `delete` endpoints that return that
resource. For `get`-by-id, prefer `NOT_FOUND` over a nullable body unless a
client depends on the `null` case.

Dates use `z.coerce.date()` to match the Drizzle row type.

### `.errors()` — only what the endpoint can actually raise

```ts
.errors({
  NOT_FOUND: {
    message: "X not found",
    status: 404,
  },
  BAD_REQUEST: {
    message: "Invalid input",
    status: 400,
  },
})
```

Each code must correspond to a failure this endpoint (or its handler /
resolver) can actually throw. Validation errors raised by oRPC/zod are
documented by the framework automatically (`BAD_REQUEST`/`UNPROCESSABLE_CONTENT`).

### `.route()` — what NOT to put there

These fields only restate framework defaults — omit them. Keep `.route()`
to the keys that actually vary.

| Field                  | Default      | Action |
| ---------------------- | ------------ | ------ |
| `deprecated`           | `false`      | omit unless the procedure is deprecated |
| `inputStructure`       | `"compact"`  | omit unless you actually use `"detailed"` |
| `outputStructure`      | `"compact"`  | omit unless you actually use `"detailed"` |
| `successStatus`        | `200` (or `201` for `POST`) | omit unless overriding |
| `successDescription`   | —            | omit unless the response needs an explanation not covered by `description` |

### Canonical example

```ts
import { z } from "zod"
import { devicesHandler } from "@/handlers/devices"
import { protectedProcedure } from "@/index"
import { deviceSchema } from "@/routers/inventory/schemas"

export const devicesRouter = {
  get: protectedProcedure
    .route({
      summary: "Get an inventory device",
      description: "Returns a single inventory device by id, or NOT_FOUND.",
      tags: ["Inventory"],
      method: "GET",
    })
    .input(z.object({ id: z.string().uuid() }))
    .output(deviceSchema)
    .errors({
      NOT_FOUND: {
        message: "Device not found",
        status: 404,
      },
    })
    .handler(async ({ input }) => devicesHandler.get(input.id)),

  list: protectedProcedure
    .route({
      summary: "List inventory devices",
      description: "Returns every stored inventory device.",
      tags: ["Inventory"],
      method: "GET",
    })
    .output(z.array(deviceSchema))
    .handler(() => devicesHandler.list()),
}
```

### Audit checklist

When you add or change a procedure, run:

```bash
bunx tsc --noEmit --project packages/api
```

And confirm:

- [ ] has `summary`, `description`, `tags`, `method`.
- [ ] has `.output(...)`.
- [ ] `.errors(...)` lists only the codes the endpoint can actually throw.
- [ ] does **not** re-declare `INTERNAL_SERVER_ERROR` / `UNAUTHORIZED` / `FORBIDDEN`.
- [ ] does **not** include default-only fields (`deprecated: false`,
      `inputStructure: "compact"`, `outputStructure: "compact"`, etc.).
- [ ] uses a shared resource schema (no per-endpoint drift on `list` vs `get`).
- [ ] returns a non-null body if `.output(schema)` is non-nullable; the
      handler should throw `ORPCError("NOT_FOUND")` instead of returning `null`.
