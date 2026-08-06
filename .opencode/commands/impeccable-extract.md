---
description: Pull reusable patterns and tokens into the design system
---

Run impeccable extract.

**Input:** target (page, feature, or folder). If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/extract.md` and follow it.
2. Identify repeated patterns in the target area and consolidate them.
3. Prefer extending existing primitives in `apps/frontend/src/components/ui/` and `apps/frontend/src/components/shared/` over creating new ones.
4. Run `bun run check-types` and `bun run check` after edits.
