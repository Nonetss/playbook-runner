## MODIFIED Requirements

### Requirement: Materialize playbook and credentials for execution
The service SHALL write the resolved playbook content to a playbook file and each distinct credential's private key to a key file with owner-only permissions, and SHALL build the Ansible inventory with per-host connection variables (host address, username, SSH port when present, and private key file). For a Git-sourced playbook the service SHALL instead export the repository tree at the requested commit into the run's scratch directory and run the playbook at its repository path with that tree as the project directory, using a runner-controlled configuration in which only the allowlisted options of the repository's `ansible.cfg` are applied and every other setting from it is ignored. Materialized playbook files, exported trees and key files SHALL be removed after the run finishes.

#### Scenario: Per-host connection variables are set
- **WHEN** the run is materialized for a device with an address, username, SSH port, and credential
- **THEN** the host entry SHALL set `ansible_host`, `ansible_user`, `ansible_port`, and `ansible_ssh_private_key_file` accordingly

#### Scenario: Secrets are cleaned up
- **WHEN** the run finishes, whether it succeeds or fails
- **THEN** the materialized playbook file, any exported repository tree and private key files SHALL be deleted

#### Scenario: Git playbook uses repository files
- **WHEN** a Git-sourced playbook at `site.yml` includes a role from `roles/web`
- **THEN** the run SHALL resolve the role from the exported tree at the synced commit

#### Scenario: Repository ansible.cfg is ignored
- **WHEN** the exported tree contains an `ansible.cfg` that sets `timeout = 60` and `callback_plugins = ./cb`
- **THEN** the run SHALL use the runner-controlled configuration, apply only the timeout of 60 seconds and ignore `callback_plugins`, as the capability `repository-ansible-config` defines
