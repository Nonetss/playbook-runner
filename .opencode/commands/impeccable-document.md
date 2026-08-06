---
description: Generate DESIGN.md capturing the current visual design system
---

Run impeccable document.

**Input:** none required.

**Steps:**

1. Load `.agents/skills/impeccable/reference/document.md` and follow it.
2. Auto-extract colors, typography, spacing, radii, and component patterns from `apps/frontend/src/`. Prefer reading tokens from `apps/frontend/src/styles/global.css` and shadcn primitives under `apps/frontend/src/components/ui/`.
3. Ask the user to confirm descriptive language for atmosphere and color character.
4. Write `DESIGN.md` in the Google Stitch format so it is tool-compatible.
