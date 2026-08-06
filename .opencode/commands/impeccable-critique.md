---
description: Run a UX design review with heuristic scoring against a target
---

Load the impeccable critique flow.

**Input:** target (file path, route, feature name, or visual description). If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/critique.md` and follow it.
2. Read the relevant source from the repo (Astro pages live in `apps/frontend/src/pages/...` with the matching React island under `apps/frontend/src/features/...`) before scoring.
3. Apply the heuristic scoring rubric and return findings in the format the reference specifies.
4. Never modify files — critique is read-only.
