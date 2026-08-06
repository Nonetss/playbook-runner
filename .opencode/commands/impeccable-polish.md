---
description: Final quality pass on a target before shipping
---

Run an impeccable polish pass.

**Input:** target (file, route, feature). If omitted, ask once.

**Steps:**

1. Load `.agents/skills/impeccable/reference/polish.md` and follow it.
2. Inspect the target plus neighbouring files for the incumbent visual truth (tokens, theme, components) before editing.
3. Apply the polish checklist; keep changes minimal and on-brand with `apps/frontend/src/styles/global.css` tokens and the shadcn/ui components under `components/ui/`.
4. After edits, run `bun run check-types` if the change touched TS/Astro and `bun run check` from the repo root.
