---
description: Run technical quality checks across accessibility, performance, theming, responsive design, and anti-patterns
---

Run an impeccable audit.

**Input:** target (feature, page, component, or folder). If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/audit.md` (or `audit.native.md` if the target is iOS/Android — ask before assuming native).
2. Run the scored report covering a11y, perf, theming, responsive, and anti-patterns with P0–P3 severity.
3. Output the actionable plan; do not edit files unless asked.
