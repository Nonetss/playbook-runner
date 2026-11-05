---
title: Secrets with Ansible Vault
description: Store a Git repository's Vault password so that its playbooks can use encrypted variables.
order: 8
---

If a repository already keeps its secrets with [Ansible Vault](https://docs.ansible.com/ansible/latest/vault_guide/index.html), store its password in Playbook Runner and its playbooks work without any change. For new secrets, prefer [Infisical](../infisical/), which also masks the values in the output. Both can work together in the same run.

## Store the password

1. On the Playbooks page, create or edit the repository.
2. Enter the password in **Ansible Vault password** and save.

The password is encrypted before it is stored and the API never returns it. To change it, enter the new one; leave the field empty to keep the current one, or select **Remove the stored password** to delete it. It cannot start or end with whitespace.

## What can be encrypted

| Content | Result |
| --- | --- |
| Variables with `!vault` | Decrypted |
| Encrypted variable files, in `vars_files` or in a role | Decrypted, but the app cannot show their names when you run |
| Files in `group_vars/all` or `host_vars`, next to the playbook or next to the inventory that `ansible.cfg` names | Decrypted. Without the password, the run fails before the first task |
| A fully encrypted playbook | Not supported |
| A playbook written in the app | Does not receive the password, so a `!vault` value fails |

Each repository has one password, so several Vault IDs cannot be used. It applies to jobs and manual runs of that repository, at the synced commit.

A fully encrypted playbook does not appear after a sync. If another playbook imports it with `import_playbook`, the run stops before Ansible starts and names the file, because the runner has to read the plays to run them on your selection. An import path with templates is not checked.

## Protect the values in the output

The runner masks the password, but not what Vault decrypts: only Ansible sees those values. A task that prints a value leaves it in the console and in the job's history, so tasks handling them need `no_log`:

```yaml
- name: Write the environment file
  ansible.builtin.template:
    src: app.env.j2 # uses {{ db_password }}
    dest: /etc/app.env
    mode: "0600"
  no_log: true
```

## If a run fails

With a wrong password or none, the run fails and shows Ansible's decryption error. In a job, that error stays on the run in the history. Check that the repository has the password that encrypted that commit, then run it again.

During a run, the password is in a file in the run's temporary directory, which is deleted when it ends. A task running on the runner itself could read it, so protect who can change the repository's playbooks.
