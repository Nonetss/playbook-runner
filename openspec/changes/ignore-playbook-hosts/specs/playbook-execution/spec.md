## ADDED Requirements

### Requirement: Plays target the run's selection

The runner SHALL run every play of a playbook on the hosts selected for the run, whatever the play's `hosts` value is. It SHALL apply this to the run's own copy of the playbook and of the playbooks it imports inside the project, SHALL NOT change anything else in those files, and SHALL NOT change stored playbooks or repositories.

#### Scenario: A pattern that matches no group

- **WHEN** a run selects two devices and a play says `hosts: docker_hosts`
- **THEN** the play SHALL run on both devices

#### Scenario: A play for localhost

- **WHEN** a run selects a device and a play says `hosts: localhost`
- **THEN** the play SHALL run on that device and not on the runner

#### Scenario: An imported playbook

- **WHEN** a playbook imports another file of its repository with a static path
- **THEN** the imported plays SHALL also run on the selection

#### Scenario: A file outside the project

- **WHEN** an import or a symbolic link points outside the project
- **THEN** the runner SHALL NOT write to that file

#### Scenario: A playbook that cannot be parsed

- **WHEN** a playbook is not valid YAML
- **THEN** the runner SHALL leave it unchanged so Ansible reports the error
