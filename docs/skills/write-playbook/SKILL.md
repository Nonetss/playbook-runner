---
name: write-playbook
description: How to write an Ansible playbook that runs on Playbook Runner, whose executor changes several Ansible rules (it ignores `hosts` and `become_user`, variables arrive as text, `debug` with `var` shows nothing, there are no groups, Vault or prompts). Use it before writing, reviewing or fixing a playbook for Playbook Runner, or when one shows no output, hangs or fails only there.
---

# Writing a playbook for Playbook Runner

Read the site live every time: this file only says where to look and the rules that bite silently. The site is the repository `playbook-runner` on the documentation platform (its `llms.txt`, each page's `llm.txt`, or the MCP tools `search` and `read` with `repository: playbook-runner`).

## The procedure

1. Read the recipe and start from its template: `/playbook-runner/guias/crear-playbook`.
2. Check the current rules, each with what to do about it: `/playbook-runner/ejecucion` and the `reglas` catalog type. A rule marked `leido` was read from the code, not executed.
3. Check the playbook without touching any host: `/playbook-runner/guias/probar-un-playbook`.
4. If it already fails, look its message up in the table «Síntomas» of `/playbook-runner/ejecucion`.

For detail: what the runner mounts for each run is `/playbook-runner/ejecucion/materializacion`, variables and secrets are `/playbook-runner/ejecucion/variables`, and repositories are `/playbook-runner/ejecucion/repositorios-git`.

## Rules that fail silently

- Write `hosts: all`. Every play runs on the hosts chosen at launch, whatever `hosts` says, and groups do not exist: of `group_vars`, only `all` applies.
- `delegate_to: localhost` runs inside the runner's container, unprivileged and without `sudo`: add `become: false` to that task.
- `become: true` is always root. `become_user` is ignored.
- Anything passed at launch is a string: filter it with `| bool` or `| int` where it is used.
- Only `msg`, `stdout` and `stderr` reach the console: use `debug` with `msg`, never `var`, and `join` a list.
- Nothing interactive: `vars_prompt` and `pause` without `seconds` hang the run.
- There is no `--check`, `--tags` or `--limit`: for a dry run, add a variable that turns it on.
- No secret in the YAML, and no `!vault`: use a plain variable, bound to its secret in the app, and `no_log: true` on the tasks handling it.
- A playbook written in the app is one file: roles, `import_playbook`, `vars_files` and relative `src` find nothing. Use `copy` with `content`, or a Git repository.
- In Git, a file is a playbook only if every element has `hosts` or `import_playbook`. Runs use the last synced commit, and renaming a file creates another playbook and leaves its jobs failing.

Never run a playbook against real hosts unless the user asks for it, and suggest one device first.
