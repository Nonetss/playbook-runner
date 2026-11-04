---
name: write-role
description: How to write an Ansible role, or lay out a Git repository of playbooks, for Playbook Runner, where the role search path, detection and unchecking a role at launch have their own rules. Use it before adding or changing a role, when setting up a playbook repository, or when a role is not found or does not appear in the app.
---

# Writing a role for Playbook Runner

Read the site live every time: this file only says where to look and the rules that bite silently. The site is the repository `playbook-runner` on the documentation platform (its `llms.txt`, each page's `llm.txt`, or the MCP tools `search` and `read` with `repository: playbook-runner`).

## The procedure

1. Read the recipe, which holds a complete tested role: `/playbook-runner/guias/crear-rol`.
2. The rules for playbooks apply inside a role too: follow the `playbook-runner-write-playbook` skill.
3. How syncing, detection and unchecking work: `/playbook-runner/ejecucion/repositorios-git`.

## Rules that fail silently

- Roles exist only in Git repositories: a playbook written in the app is a single file and finds none.
- `requirements.yml` is never installed and the repository's `ansible.cfg` is ignored: vendor external roles into a `roles/` folder of the tree.
- Runs use the last synced commit: after a push, someone must press **Sincronizar**.
- Unchecking a role empties its tasks but keeps its defaults: never read another role's `register` or `set_fact` without a `default(...)`.
- A secret has no value in `defaults/`: the role just reads the variable, and the app suggests that name in the playbook's secrets panel.

Commit and push only when the user asks for it.
