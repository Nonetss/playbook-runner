---
description: Add strategic color to a monochromatic UI
---

Run an impeccable colorize pass.

**Input:** target. If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/colorize.md` and follow it.
2. Add color using the existing token palette (`apps/frontend/src/styles/global.css`). Do not introduce new hues unless the reference explicitly allows it.
3. Verify contrast meets WCAG AA — this repo enforces it.
4. Run `bun run check-types` if TS/Astro was touched.
