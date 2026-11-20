## Purpose

Lets a Git repository tune how Ansible behaves for its own playbooks (timeouts, retries, fact gathering) through its `ansible.cfg`, without letting an unreviewed commit change what the runner loads, executes or connects with.

## ADDED Requirements

### Requirement: Honour an allowlist of repository ansible.cfg options
For a run of a Git-sourced playbook, the system SHALL read the `ansible.cfg` nearest to the playbook at the pinned commit (searching from the playbook's directory up to the repository root) and SHALL apply only these options to that run: `[defaults]` `timeout`, `task_timeout`, `gather_timeout` and `gathering`; `[ssh_connection]` `retries` and `pipelining`; `[persistent_connection]` `connect_timeout`, `command_timeout` and `connect_retry_timeout`. Only one `ansible.cfg` SHALL be used; configurations at several levels SHALL NOT be merged.

#### Scenario: Timeout declared by the repository
- **WHEN** the nearest `ansible.cfg` sets `[defaults] timeout = 60` and a user runs a playbook of that repository
- **THEN** Ansible SHALL run with a connection timeout of 60 seconds

#### Scenario: Playbook in a subdirectory with its own config
- **WHEN** `playbooks/ansible.cfg` sets `timeout = 30` and the repository root `ansible.cfg` sets `timeout = 90`, and a user runs `playbooks/site.yml`
- **THEN** the run SHALL use 30 seconds and SHALL NOT combine the two files

#### Scenario: Repository without ansible.cfg
- **WHEN** the exported tree has no `ansible.cfg` from the playbook up to the root
- **THEN** the run SHALL use Ansible's defaults for these options

#### Scenario: Playbook not written from a repository
- **WHEN** a user runs a playbook written in the app, or an ad-hoc command, a script or a ping
- **THEN** no `ansible.cfg` option SHALL be applied

### Requirement: Ignore every other repository option
The system SHALL ignore every `ansible.cfg` section and key outside the allowlist, including every option that selects code, paths, credentials or connection arguments (such as `library`, `*_plugins`, `roles_path`, `collections_path`, `remote_tmp`, `vault_password_file`, `private_key_file`, `ssh_args`, `inventory`) and the options the runner controls itself (`forks`, `host_key_checking`).

#### Scenario: Code-loading option in the repository config
- **WHEN** the repository's `ansible.cfg` sets `callback_plugins`, `library` or `action_plugins` to a directory of the repository
- **THEN** the run SHALL NOT load anything from those directories

#### Scenario: Runner-controlled option in the repository config
- **WHEN** the repository's `ansible.cfg` sets `forks = 50` or `host_key_checking = False`
- **THEN** the run SHALL use the run's own forks and the runner's SSH host key policy

#### Scenario: Unknown section or key
- **WHEN** the repository's `ansible.cfg` contains a section or key the system does not recognise
- **THEN** it SHALL be ignored and the run SHALL start normally

### Requirement: Validate option values
The system SHALL accept an allowlisted option only when its value is valid for its type (a non-negative integer number of seconds for timeouts, a non-negative integer for retries, a boolean for `pipelining`, `implicit`, `explicit` or `smart` for `gathering`) and SHALL discard an invalid or unreadable value without failing the run. A configuration file that cannot be parsed SHALL be treated as absent.

#### Scenario: Value of the wrong type
- **WHEN** the repository's `ansible.cfg` sets `timeout = soon`
- **THEN** that option SHALL be discarded and the run SHALL use Ansible's default timeout

#### Scenario: Unparsable file
- **WHEN** the nearest `ansible.cfg` is not valid INI
- **THEN** the run SHALL start with Ansible's defaults and SHALL NOT fail because of the file

#### Scenario: Symlinked file
- **WHEN** the nearest `ansible.cfg` is a symbolic link
- **THEN** it SHALL NOT be read

### Requirement: Runner settings outrank the repository
When the runner or the run already determines the same behaviour through its own settings or environment, the system SHALL use that value and SHALL NOT let the repository's `ansible.cfg` change it. The repository's allowlisted values SHALL rank above Ansible's defaults.

#### Scenario: Runner already sets the option
- **WHEN** the runner's own environment for the run defines a variable that corresponds to an allowlisted option and the repository's `ansible.cfg` sets that option to another value
- **THEN** the run SHALL use the runner's value

### Requirement: Report applied and discarded options
For every run of a Git-sourced playbook that has a readable `ansible.cfg`, the system SHALL log which options it applied (section, key and value) and which it discarded with the reason (not allowed, controlled by the runner or invalid value). The log SHALL NOT include the values of discarded keys that are outside the allowlist.

#### Scenario: Mixed configuration
- **WHEN** the repository's `ansible.cfg` sets `timeout = 60`, `roles_path = ./x` and `retries = many`
- **THEN** the log for that run SHALL list `timeout` as applied, `roles_path` as not allowed and `retries` as invalid, and the run SHALL start
