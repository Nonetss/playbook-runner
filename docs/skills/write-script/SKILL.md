---
name: write-script
description: How to write a Bash or Python script, or prepare an ad-hoc command, to run on devices from Playbook Runner, and how to choose between a script, a command and a playbook. Use it when the user wants a script for their hosts or a one-off command on several devices, or hesitates between a script and a playbook.
---

# Writing a script for Playbook Runner

Read the site live every time: this file only says where to look and the rules that bite silently. The site is the repository `playbook-runner` on the documentation platform (its `llms.txt`, each page's `llm.txt`, or the MCP tools `search` and `read` with `repository: playbook-runner`).

Read the recipe, with its comparison table and its templates: `/playbook-runner/guias/crear-script`.

## Rules that fail silently

- A script takes no arguments, variables, secrets or standard input: put values in constants at the top. If it needs any of those, or a cron schedule, propose a playbook and follow the `playbook-runner-write-playbook` skill.
- Its exit code decides the result. `stderr` may carry harmless SSH notices.

Never run a script or a command on real hosts unless the user asks for it, and suggest one device first.
