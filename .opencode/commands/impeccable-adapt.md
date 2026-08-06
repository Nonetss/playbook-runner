---
description: Adapt a target for different screen sizes, devices, or platforms
---

Run an impeccable adapt pass.

**Input:** target and an optional context (mobile, tablet, desktop, print, ...). If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/adapt.md` (or `adapt.native.md` for native).
2. Implement breakpoints, fluid layout, and touch targets appropriate for the requested context.
3. Run `bun run check-types` after edits.
