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

Put devices in **groups** to target several of them at once. Because each device carries its own credential, a group can mix hosts that use different users and keys.

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

Save it and press **Run**. Pick the device (or a group), review the confirmation step and start the run. The `PLAY`, `TASK` and recap lines stream into the console as Ansible emits them. Closing the tab cancels the run on the executor.

The first time Playbook Runner connects to a host it records the host's SSH key and rejects it if it changes later. See `SSH_HOST_KEY_POLICY` in [Configuration](../configuration/) to change that.

## 4. Schedule it

From **Ansible → Scheduler**, create a job: a playbook, a target and a cron expression such as `0 2 * * *` (every day at 02:00). The backend fires it on time; a job never runs twice at once, and every run lands in **History** with its status, duration and hosts.

## Example playbooks

The repository ships a few starters under [`playbooks/`](https://github.com/Nonetss/playbook-runner/tree/main/playbooks): `ping.yml`, `apt-upgrade.yml`, `disk-usage.yml`, `check-uptime.yml`, `gather-facts.yml`, `restart-service.yml`, `clean-docker-img.yml` and `fail2ban-status.yml`.

To try the Git integration with them, choose **Add repository** on the Playbooks page and enter:

| Field | Value |
| --- | --- |
| Clone URL | `https://github.com/Nonetss/playbook-runner.git` |
| Branch | `main` |
| Subdirectory | `playbooks` |

Each file appears as a read-only playbook you can run and schedule. **Copy to Playbook Runner** turns one into a regular, editable playbook.
