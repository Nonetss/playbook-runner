---
title: Your first run
description: Store an SSH credential, add a host and run a playbook against it, live.
order: 2
---

This walkthrough takes a fresh installation to its first successful run. You need a host you can reach over SSH from the server running Playbook Runner.

## 1. Add an SSH credential

Open **Inventory → Credentials** and create a credential. A credential is an SSH user plus a key pair. You can:

- **Import existing key**, pasting a private key you already use, or
- **Generate key pair**, a new ed25519 pair created in the browser.

For a generated key, the credential offers a **provision script**: run it once on the target host as root and it creates the user, authorizes the public key and grants passwordless `sudo`.

The private key is encrypted before it is stored and the API never returns it. It is decrypted only on the server, when a run needs it.

## 2. Add a device

Open **Inventory → Devices** and add the host: a name, its IP address and SSH port, and the credential from the previous step. Device and group names may contain letters, digits, `.`, `_` and `-`, up to 64 characters.

Put devices in **groups** to target several of them at once. Because each device carries its own credential, a group can mix hosts that use different users and keys. The built-in **All** group always contains every device, including ones you add later, so a scheduled job that targets it covers the whole inventory; for that reason `all` (in any letter case) cannot be used as a group name.

## 3. Run a playbook

Open **Ansible → Playbooks** and create a playbook. This one checks that SSH and Python work on every host:

```yaml
- name: Ping
  hosts: all
  gather_facts: false
  tasks:
    - name: Ping
      ansible.builtin.ping:
```

A play always runs on the devices you select for the run: Playbook Runner ignores whatever `hosts` says, including `localhost`. To run a task on the runner, use `delegate_to: localhost`.

Save it and press **Run**. Pick the device (or a group), review the confirmation step and start the run. The `PLAY`, `TASK` and recap lines stream into the console as Ansible emits them. Closing the tab cancels the run on the executor.

The first time Playbook Runner connects to a host it records the host's SSH key and rejects it if it changes later. See `SSH_HOST_KEY_POLICY` in [Configuration](../configuration/) to change that.

## 4. Schedule it

From **Ansible → Scheduler**, create a job: a playbook, a target and a cron expression such as `0 2 * * *` (every day at 02:00). The backend fires it on time; a job never runs twice at once, and every run lands in **History** with its status, duration and hosts.

## Example playbooks

The repository ships a few starters under [`playbooks/`](https://github.com/Nonetss/playbook-runner/tree/main/playbooks): `ping.yml`, `apt-upgrade.yml`, `disk-usage.yml`, `check-uptime.yml`, `gather-facts.yml`, `restart-service.yml`, `clean-docker-img.yml`, `fail2ban-status.yml` and `system-report.yml`, which is built from roles.

To try the Git integration with them, choose **Add repository** on the Playbooks page and enter:

| Field | Value |
| --- | --- |
| Clone URL | `https://github.com/Nonetss/playbook-runner.git` |
| Branch | `main` |
| Subdirectory | `playbooks` |

Each file appears as a read-only playbook you can run and schedule. **Copy to Playbook Runner** turns one into a regular, editable playbook.

## Roles in a Git repository

A Git playbook can use the [Ansible roles](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html) stored in its repository, at the same synced commit. A run searches every `roles/` directory from the playbook's folder up to the repository root, and the nearest one wins:

```text
playbooks/site.yml      # runs roles from both directories below
playbooks/roles/        # searched first
roles/                  # searched next
```

The repository's own `ansible.cfg` is ignored, so a custom `roles_path` has no effect. When a run finds any of these directories, they replace Ansible's default role paths such as `/usr/share/ansible/roles`, which only matters if you built your own image with roles installed there.

To see one working, sync the example repository above and run `system-report.yml`, which uses the two roles in [`playbooks/roles/`](https://github.com/Nonetss/playbook-runner/tree/main/playbooks/roles).

Each repository on the Playbooks page lists its roles read-only. To change a role, commit to the repository and sync it. Roles are not available to playbooks written in Playbook Runner, because those are a single file.

While a repository is expanded, each playbook card names the roles it declares and each role names the playbooks declaring it. This comes from `roles`, `include_role` and `import_role` in the playbook's plays, following `import_playbook`. Roles reached through `include_tasks` or another role's dependencies are not counted, so "no playbook declares it directly" doesn't mean a role is unused. A name only known at run time appears as "dynamic role".

When you run a Git playbook by hand, its form lists the roles it declares from the repository, all checked. Uncheck one to leave it out of that run: it is emptied in the run's own copy, so neither the playbook nor the repository changes, and its dependencies don't run either. The playbook's own tasks always run, and handlers, `defaults` and `vars` from the unchecked role are still available. Another role that relied on what it did may fail. Scheduled jobs always run every role.

The same form lists the variables the playbook defines: `vars` and `vars_files` in its plays, and, for the roles it declares, the `vars` next to each one and their `defaults` and `vars`. Playbooks written in Playbook Runner get this too, from the `vars` of their plays. The playbook's secrets panel suggests the same names once a connection and environment are chosen, so you can point one at a secret with a click. They also include what a role reads in its tasks and templates without anything defining it, so a role can ask for a secret without the playbook mentioning it. Use the button next to one to override it for that run, which passes it as an extra var. Values are only shown when they are plain: encrypted values, lists, dictionaries and names that look sensitive (`password`, `token`, `key`…) appear without one. Variables from `group_vars`, `include_vars` or a role's dependencies aren't detected, and `ansible_*` ones are left out because a run can't override them.

Dependencies in `requirements.yml` **are not installed**. The page warns you when it finds that file at the repository root, in the configured subdirectory, or directly in `roles/` or `collections/` at those levels. A playbook using one of those external roles fails with a "role not found" error; to use it, copy the role into the repository.
