# TODO

## Pending

- [ ] Add a way to cancel a playbook that is currently running (not supported today)

## Ideas

- [ ] Define input variables for playbooks and scripts (e.g. a ping script with an IP you must fill in before running, or a set of variables passed at execution time) — needs design
- [ ] Send notifications via ntfy (e.g. job failures, run completion, healthcheck alerts)
- [ ] Healthcheck alerts — notify or surface warnings when a healthcheck fails or degrades
- [ ] Persist manual playbook executions in history (today only scheduled/manual job runs appear in `/history`)
- [ ] Stop requiring `hosts: all` in playbooks — today run-time host selection is injected under a single `all` group, so custom patterns (e.g. `docker_hosts`) match nothing and plays are skipped; support real inventory groups / host patterns in playbook YAML
- [ ] Schedule scripts as jobs — today scheduled jobs only reference `playbookId`; support cron jobs that run a stored script instead of a playbook
- [ ] Playbook revision history — only the current content is stored; add change history and the ability to roll back to a previous version
- [ ] Import/export playbooks — create playbooks from YAML files on disk and export them back to files (handy when migrating from Git repos)
- [ ] Secrets for sensitive extravars — SSH keys live in credentials, but there is no way to manage secret playbook variables (e.g. Ansible Vault or an equivalent)

## Done
