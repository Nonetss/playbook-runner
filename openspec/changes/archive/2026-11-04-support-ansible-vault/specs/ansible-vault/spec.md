## Purpose

Lets the playbooks of a Git repository use secrets encrypted with Ansible Vault, by storing that repository's Vault password and using it when they run.

## ADDED Requirements

### Requirement: A repository can store a Vault password

The system SHALL let an authenticated user set, replace and remove one Vault password per playbook repository. The password SHALL be encrypted at rest and SHALL NOT be returned by any API response; responses SHALL only report whether the repository has one. Updating a repository without mentioning the password SHALL leave it unchanged.

#### Scenario: Set a password on creation

- **WHEN** a user creates a repository with a Vault password
- **THEN** the system SHALL store it encrypted and the response SHALL report that the repository has a password, without its value

#### Scenario: Update without mentioning the password

- **WHEN** a user updates a repository's other fields and omits the password
- **THEN** the stored password SHALL stay unchanged

#### Scenario: Replace the password

- **WHEN** a user updates a repository with a new password
- **THEN** later runs SHALL use the new password

#### Scenario: Remove the password

- **WHEN** a user updates a repository with a null password
- **THEN** the system SHALL delete the stored password and report that the repository has none

#### Scenario: Reject a password Ansible would alter

- **WHEN** a user sends an empty password or one with leading or trailing whitespace
- **THEN** the system SHALL reject the request with `BAD_REQUEST` without changing the repository

#### Scenario: Reading repositories

- **WHEN** a user lists, reads or syncs a repository that has a password
- **THEN** the response SHALL contain neither the password nor its encrypted form

### Requirement: Runs of a repository's playbooks can decrypt Vault content

For a run or job of a Git-sourced playbook whose repository has a Vault password, Ansible SHALL be able to decrypt `!vault` values and encrypted variable files in the commit being run, without any change to the playbook. The password SHALL be available to the runner only for the duration of the run and SHALL NOT remain on disk after it, whether the run succeeds, fails or is cancelled.

#### Scenario: Interactive run with a vaulted variable

- **WHEN** a user runs a Git playbook that uses a `!vault` variable and its repository has the matching password
- **THEN** the task SHALL receive the decrypted value

#### Scenario: Job with an encrypted variable file

- **WHEN** a job runs a Git playbook whose `vars_files` includes a file encrypted with the repository's password
- **THEN** the job SHALL use the decrypted variables

#### Scenario: Together with Infisical secret variables

- **WHEN** a playbook uses `!vault` values and also declares Infisical secret variables
- **THEN** the run SHALL receive both, and Infisical values SHALL still be masked as before

#### Scenario: Wrong password

- **WHEN** the stored password does not decrypt a value the run uses
- **THEN** the run SHALL fail, reporting Ansible's decryption error in its output

#### Scenario: No password

- **WHEN** a playbook uses a `!vault` value and its repository has no password
- **THEN** the run SHALL fail, reporting Ansible's decryption error in its output

#### Scenario: Password file cannot execute

- **WHEN** the runner hands the stored password to Ansible
- **THEN** Ansible SHALL read it as a value and SHALL NOT execute it as a script

#### Scenario: Run that ends

- **WHEN** a run finishes, fails or is cancelled
- **THEN** no copy of the password SHALL remain in the run's scratch directory

### Requirement: Only Git-sourced playbook runs receive the password

The system SHALL send a repository's Vault password to the runner only to run a playbook of that repository. Repository syncs and listings, commands, scripts, pings and inline playbooks SHALL NOT receive it.

#### Scenario: Syncing a repository

- **WHEN** a repository with a password is synced or its roles are listed
- **THEN** the request to the runner SHALL NOT carry the password

#### Scenario: Inline playbook with a vaulted value

- **WHEN** a playbook written in the app uses a `!vault` value
- **THEN** the run SHALL fail, reporting Ansible's decryption error in its output

### Requirement: Fully encrypted playbook files are refused

A run SHALL end before Ansible starts, with an error naming the file, when the playbook it runs or a file that playbook reaches through `import_playbook` is entirely encrypted with Vault, because the runner could not make its plays run on the selection. Encrypted variable files and `!vault` values SHALL NOT cause this refusal.

#### Scenario: Imported playbook encrypted

- **WHEN** a playbook imports a file encrypted with `ansible-vault encrypt`
- **THEN** the run SHALL fail with an error naming that file, and no task SHALL execute

#### Scenario: Encrypted file in the repository listing

- **WHEN** a repository contains a fully encrypted playbook file
- **THEN** the sync SHALL NOT list it as a playbook and SHALL NOT fail because of it

#### Scenario: Plain playbook with vaulted values

- **WHEN** a playbook is plain YAML with `!vault` values
- **THEN** the run SHALL proceed and its plays SHALL run on the selection

### Requirement: Decrypted values are not masked

The system SHALL NOT claim to mask values decrypted by Ansible Vault, and the documentation and the repository form SHALL state that tasks handling them need `no_log`. The Vault password itself SHALL be masked in run output when it has at least 4 characters, like other secrets the runner knows.

#### Scenario: Task prints a vaulted variable

- **WHEN** a task without `no_log` prints a decrypted value
- **THEN** the value MAY appear in the output, as the documentation warns

#### Scenario: Output contains the password

- **WHEN** run output contains the Vault password literally
- **THEN** the system SHALL mask it

#### Scenario: Repository form

- **WHEN** a user sees the Vault password field
- **THEN** the form SHALL state that the password is never shown again and that tasks handling decrypted values need `no_log`

### Requirement: Operators manage the password from the repository form

The repository form SHALL let a user set a Vault password, keep the current one by leaving the field empty, and remove it, and SHALL show whether the repository has one without showing its value.

#### Scenario: Editing a repository with a password

- **WHEN** a user opens the form of a repository that has a password
- **THEN** the form SHALL show that one is set and an empty field whose hint says that leaving it empty keeps the current password

#### Scenario: Removing the password

- **WHEN** a user chooses to remove the password and saves
- **THEN** the repository SHALL have no password afterwards
