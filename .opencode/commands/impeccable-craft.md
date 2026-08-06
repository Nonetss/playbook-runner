---
description: Build a new surface or replace the visual world for an existing feature
---

Run impeccable craft — a new-work request.

**Input:** feature description. If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/new-work.md` and follow it (the `craft` alias is deprecated; this maps directly to the new-work flow).
2. If `PRODUCT.md` is missing, route through `/impeccable-init` first.
3. Inspect the target area (Astro page under `apps/frontend/src/pages/...` and the matching React island under `apps/frontend/src/features/...`) before editing.
4. Apply the surface mode rules (Persuade / Operate / Read / Experience) per `reference/new-work.md`.
5. Run `bun run check-types` and `bun run check` after the build.
