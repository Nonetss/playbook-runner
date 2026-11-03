---
title: Secrets with Infisical
description: Declare the variables a playbook needs, choose their secrets from Infisical, and let the runner deliver them to each run.
order: 7
---

A playbook uses plain variables and never mentions Infisical. You choose which secret fills each variable, and the runner reads the values just before Ansible starts. Values never reach the backend, the database or the browser.

```yaml
- name: Configure the app
  hosts: web
  tasks:
    - name: Write the environment file
      ansible.builtin.template:
        src: app.env.j2 # uses {{ db_password }}
        dest: /etc/app.env
        mode: "0600"
      no_log: true
```

## Create a connection

1. In Infisical, create a machine identity with **Universal Auth** and give it access only to the project and paths it needs.
2. Open **Ansible → Infisical**, create a connection and enter the Infisical URL, the project ID (in **Project Settings**), the client ID and the client secret.

The client secret is encrypted before it is stored and the API never returns it. To rotate it, edit the connection and enter the new one; leave the field empty to keep the current one.

A connection that a job or a playbook uses cannot be deleted. Remove it from them first.

## Declare a playbook's secrets

Open the playbook's edit page and use the **Infisical secrets** panel on the right, which has its own save button. Pick the connection and the default environment, then add a row per variable: the secret and the variable name, which is suggested from the secret. This also works on Git playbooks, because the declaration is stored apart from their read-only content, and a sync never changes it.

The list shows names only, from the root of the environment, so secrets inside folders cannot be chosen. If a secret is no longer listed it stays visible in its row, so you can replace it.

## Run with secrets

The variables a playbook declares appear filled in on the run page and the job form, marked **from the playbook**. You can point one at another secret for that run or job, but you cannot remove it, because the playbook relies on it.

You can also change the connection or the environment and add variables, each one either typed text or a secret. Without a connection, only typed text is offered.

| Setting | What a run uses |
| --- | --- |
| Connection | The run's or job's, otherwise the playbook's |
| Environment | The run's or job's, otherwise the playbook's |
| Variables | The playbook's, plus the run's or job's. The same name replaces the playbook's secret |

A job stores only its own entries, so later changes to the playbook's declaration still reach it. What you choose for one interactive run is not stored.

An environment slug belongs to a project, so if you change the connection, choose its environment too. Otherwise the run stops on the first secret it cannot find.

## When a run stops before Ansible

The runner reads every secret first, so a run never starts with one missing. It fails, naming the variable, when:

- Infisical is unreachable or does not answer within `INFISICAL_TIMEOUT_S`, or rejects the credentials.
- A secret does not exist in that environment and path.
- The identity can list a secret but not read its value.
- The connection has no project ID. Connections created before this field existed must be edited to add it.
- An extra var has the same name as a secret variable.

Scheduled jobs fail the same way and show the error in their history.

## Limits to keep in mind

- **Use `no_log: true` on tasks that transform or print secrets.** The runner masks the literal values of at least 4 characters in events and logs, but not a transformed value such as a base64 encoding. Task output is stored in the run history.
- **Anyone who can edit or run a playbook can read what its connection allows.** They can choose any secret on the run page, or print one from a task. Least-privilege access in Infisical is the control that matters.
- **Connections do not isolate users from each other.** Any active user can use any connection, and runs share one system user on the runner, so a playbook with local tasks could read the secrets file of another run in progress. The same already applies to SSH keys. The file is owner-only and is removed when the run ends.
- **Each run depends on Infisical being up.** Values are not cached between runs.
- **Do not set `INFISICAL_*` variables on the runner container.** Every run would inherit them, including runs with no connection.
- The runner container needs network access to your Infisical instance.

## Using the collection directly

The runner image still includes the `infisical.vault` collection. Selecting a connection does not give its lookups or modules any credentials, which keeps them out of the reach of every task. To use the collection, pass them explicitly, for example from two declared secret variables. Its modules read no environment and run on the target host, where the Infisical SDK is usually missing, so they also need `delegate_to: localhost`.

```yaml
- name: Read secrets with the module
  infisical.vault.read_secrets:
    url: https://infisical.example.com
    auth_method: universal_auth
    universal_auth_client_id: "{{ infisical_client_id }}"
    universal_auth_client_secret: "{{ infisical_client_secret }}"
    project_id: "<project-id>"
    env_slug: prod
    path: /
    as_dict: true
  delegate_to: localhost
  register: secrets
  no_log: true
```
