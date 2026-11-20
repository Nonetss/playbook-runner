## MODIFIED Requirements

### Requirement: Resolve repository roles during Git runs
A run of a Git-sourced playbook SHALL resolve roles from every `roles/` directory between the playbook's directory and the repository root, at the pinned commit, with the directory nearest the playbook taking precedence. The repository's own `ansible.cfg` SHALL NOT change where roles are looked up: its role-related options remain ignored, since only the options of the capability `repository-ansible-config` are honoured.

#### Scenario: Role at the repository root and playbook in a subdirectory
- **WHEN** a user runs `playbooks/site.yml` and its role exists only in `roles/` at the repository root
- **THEN** the run SHALL find and execute that role

#### Scenario: Role next to the playbook
- **WHEN** a user runs a playbook whose role exists in a `roles/` directory next to it
- **THEN** the run SHALL find and execute that role

#### Scenario: Same role name at two levels
- **WHEN** a role with the same name exists next to the playbook and at the repository root
- **THEN** the run SHALL use the role next to the playbook

#### Scenario: Repository config tries to change the role path
- **WHEN** the repository's `ansible.cfg` sets `roles_path` to another directory
- **THEN** the run SHALL ignore that setting

#### Scenario: Role unknown to the repository
- **WHEN** a playbook references a role that is in none of the searched directories
- **THEN** the run SHALL fail and report Ansible's role-not-found error
