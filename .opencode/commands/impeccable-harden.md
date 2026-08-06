---
description: Production-ready pass — errors, empty states, i18n, edge cases
---

Run an impeccable harden pass.

**Input:** target. If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/harden.md` and follow it.
2. Cover error states, empty/loading/error UI, i18n-readiness, and edge cases for the target feature.
3. Run `bun run check-types` from repo root after edits.
