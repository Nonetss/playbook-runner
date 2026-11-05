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
4. Check it without touching any host, with `ANSIBLE_ROLES_PATH` set: `/playbook-runner/guias/probar-un-playbook`.

## Rules that fail silently

- Roles exist only in Git repositories: a playbook written in the app is a single file and finds none.
- `requirements.yml` is never installed and the repository's `ansible.cfg` is ignored: vendor external roles into a `roles/` folder of the tree.
- Runs use the last synced commit: after a push, someone must press **Sincronizar**.
- A role is a directory directly under `roles/` with `tasks/main` or `meta/main`. Only the `roles/` folders from the playbook up to the repository root are searched.
- Only a role named literally in `roles:`, `include_role` or `import_role` can be unchecked. What arrives through `include_tasks` or `dependencies` still runs.
- Unchecking a role empties its tasks but keeps its defaults: never read another role's `register` or `set_fact` without a `default(...)`. It only applies to interactive runs: jobs run every role.
- Give each role a unique name: unchecking acts on every directory with that name.
- Prefix its variables with the role's name, so they do not collide. A value passed at launch wins over `defaults/` and `vars/`, in templates too, with the type of its row.
- A secret has no value in `defaults/`: the role just reads the variable, and the app suggests that name in the playbook's secrets panel.

Commit and push only when the user asks for it.
