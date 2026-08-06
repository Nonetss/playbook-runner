---
description: Improve typography hierarchy, scale, and font choices
---

Run an impeccable typeset pass.

**Input:** target. If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/typeset.md` and follow it.
2. Adjust type scale/weights only via tokens in `apps/frontend/src/styles/global.css`; do not introduce new font families.
3. Run `bun run check-types` if TS/Astro was touched.
