---
description: Show the impeccable command menu, then route to the chosen command
---

Present the impeccable command menu and route the user to the matching command.

**Steps:**

1. Load `.agents/skills/impeccable/reference/routing.md` and follow it.
2. Render the menu from the Commands table in `.agents/skills/impeccable/SKILL.md` (categories: Build, Evaluate, Refine, Enhance, Fix, Iterate, System).
3. Wait for the user to pick one. Never auto-run a command.
4. Invoke the matching `/impeccable-<command>` slash command (all of which live in `.opencode/commands/`) with the user's input appended.

Alias notes from the skill: `teach` → `init`; `craft` → `new-work` (use `/impeccable-craft`); `shape` is task discovery then enters `new-work` only for visual-world and surface-concept decisions.
