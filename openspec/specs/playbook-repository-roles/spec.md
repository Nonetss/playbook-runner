# playbook-repository-roles Specification

## Purpose

Lets Git-sourced playbooks use the Ansible roles stored in their repository, and shows users read-only which roles a repository provides and which of its dependencies are not installed.

## Requirements

### Requirement: Resolve repository roles during Git runs
A run of a Git-sourced playbook SHALL resolve roles from every `roles/` directory between the playbook's directory and the repository root, at the pinned commit, with the directory nearest the playbook taking precedence. The repository's own `ansible.cfg` SHALL remain ignored.

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

### Requirement: Run directory label cannot split the role path
A playbook's name or path SHALL NOT affect how the role search path is parsed. A repository directory containing the path-list separator SHALL be left out of the search path instead of failing the run.

#### Scenario: Playbook name contains a colon
- **WHEN** a user runs a Git-sourced playbook whose name contains `:` and its role is at the repository root
- **THEN** the run SHALL find and execute that role

### Requirement: List a repository's roles
The system SHALL let an authenticated user list the roles of a repository at its last synced commit. Each role SHALL have a name, its path relative to the repository root and an optional description taken from `galaxy_info.description` in its `meta/main.yml`. A role SHALL be a directory directly under a `roles/` directory that contains `tasks/main.yml`, `tasks/main.yaml`, `meta/main.yml` or `meta/main.yaml`. The list SHALL include role directories under the configured subdirectory and in `roles/` directories of its ancestors, and SHALL exclude hidden directories, `collections/` and roles nested inside another role. Listing SHALL NOT store anything or change the repository's sync state.

#### Scenario: Repository with roles
- **WHEN** a user lists the roles of a repository synced at a commit containing `roles/nginx/tasks/main.yml` and `roles/docker/meta/main.yml`
- **THEN** the response SHALL contain both roles with their names and paths, and the synced commit

#### Scenario: Role with a description
- **WHEN** a role's `meta/main.yml` defines `galaxy_info.description`
- **THEN** that role SHALL be returned with the description

#### Scenario: Invalid role metadata
- **WHEN** a role's `meta/main.yml` is invalid YAML, is not UTF-8 text or is too large to read
- **THEN** the role SHALL still be listed, with no description

#### Scenario: Directory that is not a role
- **WHEN** a directory under `roles/` has no `tasks/main` or `meta/main` file
- **THEN** it SHALL NOT be listed

#### Scenario: Role inside a bundled collection
- **WHEN** the repository contains `collections/ansible_collections/acme/web/roles/nginx/tasks/main.yml`
- **THEN** that role SHALL NOT be listed

#### Scenario: Role outside the configured subdirectory
- **WHEN** a repository is configured with subdirectory `infra` and contains `roles/base/tasks/main.yml`, `infra/roles/web/tasks/main.yml` and `apps/roles/api/tasks/main.yml`
- **THEN** `base` and `web` SHALL be listed and `api` SHALL NOT

#### Scenario: Repository never synced
- **WHEN** a user lists the roles of a repository with no synced commit
- **THEN** the response SHALL have a null commit and no roles, and the Git service SHALL NOT be contacted

#### Scenario: Unknown repository
- **WHEN** a user lists the roles of a repository id that does not exist
- **THEN** the system SHALL return `NOT_FOUND`

#### Scenario: Anonymous caller
- **WHEN** a caller without an authenticated session lists a repository's roles
- **THEN** the system SHALL return `UNAUTHORIZED`

#### Scenario: Git service failure
- **WHEN** the synced commit cannot be read or fetched, or the Git service is unreachable
- **THEN** the system SHALL return an error and SHALL NOT change the repository's stored sync state

### Requirement: Report uninstalled role dependencies
The role listing SHALL report the paths of any `requirements.yml` or `requirements.yaml` at the repository root, in the configured subdirectory, or directly in a `roles/` or `collections/` directory at either of those levels. The system SHALL NOT install those dependencies.

#### Scenario: Repository declares external roles
- **WHEN** a repository contains `roles/requirements.yml`
- **THEN** the listing SHALL include that path and no run SHALL install its dependencies

#### Scenario: Repository without dependency files
- **WHEN** a repository has no `requirements.yml` at those locations
- **THEN** the listing SHALL report no dependency files

### Requirement: Show a repository's roles in the UI
The repository section of the Playbooks page SHALL show the repository's roles read-only while the section is expanded, with each role's name, path and description, and SHALL NOT offer to create, edit, delete or run a role. It SHALL warn when the listing reports dependency files, naming them and stating that their dependencies are not installed. A failure to load the roles SHALL NOT hide the repository's playbooks. A successful sync SHALL refresh the list.

#### Scenario: Expand a repository with roles
- **WHEN** a user expands a synced repository that contains roles
- **THEN** the section SHALL show its roles alongside its playbooks

#### Scenario: Collapsed repository
- **WHEN** a repository section is collapsed
- **THEN** its roles SHALL NOT be requested

#### Scenario: Repository without roles
- **WHEN** a synced repository has no roles and no dependency files
- **THEN** the section SHALL show its playbooks without a roles block

#### Scenario: Repository with a requirements file
- **WHEN** the listing reports `requirements.yml`
- **THEN** the section SHALL show a warning naming that file

#### Scenario: Roles cannot be loaded
- **WHEN** the roles request fails
- **THEN** the section SHALL show the error in the roles block and keep showing the playbooks

#### Scenario: Sync brings a new role
- **WHEN** a user syncs a repository whose new commit adds a role
- **THEN** the section SHALL show the new role without a page reload

### Requirement: Report the roles each playbook declares
The role listing SHALL report, for each playbook in the configured subdirectory of the synced commit that declares roles, its path and the role names it declares: entries in a play's `roles`, and `include_role` or `import_role` (including `ansible.builtin.*`) in its `pre_tasks`, `tasks`, `post_tasks` and `handlers`, inside `block`, `rescue` and `always` too. It SHALL follow `import_playbook` relative to the importing file, and SHALL flag a playbook as dynamic when a role name or import path is templated. It SHALL NOT follow `include_tasks` or role dependencies in `meta/main.yml`, and SHALL compute this without storing anything.

#### Scenario: Playbook with a role in each form
- **WHEN** a playbook lists a role under `roles` and another through `include_role` inside a `block`
- **THEN** the listing SHALL report both names for that playbook

#### Scenario: Roles behind an import
- **WHEN** a playbook only contains `import_playbook` of a file that declares a role
- **THEN** the listing SHALL report that role for the importing playbook

#### Scenario: Import cycle or unreadable import
- **WHEN** imports form a cycle, or an imported file is missing or is not valid YAML
- **THEN** the listing SHALL still succeed with the roles it could read

#### Scenario: Templated role name
- **WHEN** a playbook uses `include_role` with `name: "{{ which }}"`
- **THEN** the listing SHALL flag that playbook as dynamic and SHALL NOT report the template as a role name

#### Scenario: Playbook without roles
- **WHEN** a playbook declares no role and no templated one
- **THEN** the listing SHALL NOT include it

### Requirement: Show role usage in the UI
While a repository section is expanded, each of its playbook cards that declares roles SHALL show their names, with a generic label for dynamic ones, and each listed role SHALL show the playbooks declaring it by name, or state that no playbook declares it directly. The page SHALL NOT make any additional request for this while the section is collapsed.

#### Scenario: Playbook using roles
- **WHEN** a user expands a repository with a playbook declaring `system_report`
- **THEN** that playbook's card SHALL show `system_report` and the role SHALL show that playbook's path

#### Scenario: Role nobody declares
- **WHEN** a role is not declared by any playbook
- **THEN** the role SHALL state that no playbook declares it directly, without claiming it is unused

#### Scenario: Roles cannot be loaded
- **WHEN** the roles request fails
- **THEN** the playbook cards SHALL be shown without a roles row

### Requirement: Choose the roles of an interactive run
The form to run a Git playbook by hand SHALL list the roles it declares that exist in the repository, all checked, and a run SHALL NOT execute the tasks or `meta/main.yml` dependencies of those unchecked, however they are referenced. The system SHALL apply this only to that run's own copy of the tree, SHALL NOT change the playbook or the repository, SHALL keep the role's `defaults`, `vars` and `handlers`, and SHALL still run the playbook's own tasks. Scheduled jobs SHALL run every role.

#### Scenario: Run with a role unchecked
- **WHEN** a user unchecks `disk_report` and runs `system-report.yml`
- **THEN** `disk_report` SHALL NOT run, `system_report` SHALL run, and the run SHALL state which roles were left out

#### Scenario: Playbook without selectable roles
- **WHEN** a playbook declares no role that exists in its repository
- **THEN** the form SHALL NOT show the roles block

#### Scenario: Role no longer in the commit
- **WHEN** an unchecked role does not exist in the commit being run
- **THEN** the run SHALL end with an error before Ansible starts

#### Scenario: Invalid role name
- **WHEN** a request names a disabled role containing a path separator, or `.` or `..`
- **THEN** the system SHALL reject it without touching any file

#### Scenario: Inline playbook
- **WHEN** a request disables a role on a playbook written in Playbook Runner
- **THEN** the system SHALL reject it with `BAD_REQUEST`

#### Scenario: Symbolic links in the repository
- **WHEN** a disabled role's files are symbolic links to paths outside the role
- **THEN** the system SHALL replace the links and SHALL NOT write to their targets

### Requirement: Report the variables each playbook defines
The role listing SHALL report, for each playbook in the configured subdirectory of the synced commit that defines variables, their names and origin: `vars` and non-templated `vars_files` of its plays, following `import_playbook`, and `defaults/main` and `vars/main` of the roles it declares, resolved to the nearest `roles/` directory. It SHALL NOT report `ansible_*` variables, and SHALL NOT read `group_vars`, `include_vars` or role dependencies. A value SHALL only be returned when it is a short plain scalar, and never when it is tagged (such as `!vault`) or its name looks sensitive. Nothing SHALL be stored.

#### Scenario: Variables of a play and its role
- **WHEN** a playbook sets `port` in `vars` and declares a role whose `defaults/main.yml` sets `web_root`
- **THEN** the listing SHALL report `port` with no role and `web_root` with that role

#### Scenario: Encrypted value
- **WHEN** a variable is defined with `!vault`
- **THEN** the listing SHALL report its name without a value

#### Scenario: Sensitive-looking name
- **WHEN** a variable is named `db_password` with a plain value
- **THEN** the listing SHALL report its name without a value

#### Scenario: Unreadable source
- **WHEN** a `vars_files` entry is templated, missing or invalid
- **THEN** the listing SHALL still succeed with the variables it could read

### Requirement: Offer detected variables when running by hand
The form to run a Git playbook by hand SHALL list the detected variables, one per name, each with its origin and value when known, and SHALL let the user override one for that run as an extra var. It SHALL NOT list those of an unchecked role or those that already have a row. Nothing SHALL be sent for a variable the user does not override.

#### Scenario: Override a detected variable
- **WHEN** a user overrides a detected `port` whose value is `80`
- **THEN** an editable variable row SHALL appear with that name and value, and `port` SHALL leave the list

#### Scenario: Role unchecked
- **WHEN** a user unchecks a role
- **THEN** the variables only that role defines SHALL leave the list

### Requirement: Variables of a playbook written in the application
The system SHALL report the `vars` of the plays of a playbook written in the application under the same rules for names and values, and the form to run it by hand SHALL offer them like those of a Git playbook. It SHALL return an empty list for a Git playbook and for content that cannot be parsed, and SHALL store nothing.

#### Scenario: Written playbook with variables
- **WHEN** a user opens the run form of a written playbook whose play sets `port: 80`
- **THEN** the form SHALL offer `port` with the value `80` and no role

#### Scenario: Written playbook that cannot be parsed
- **WHEN** a written playbook's content is not valid YAML
- **THEN** the listing SHALL be empty and the form SHALL still let the user run it

#### Scenario: Runner unreachable
- **WHEN** the variables cannot be listed
- **THEN** the form SHALL still let the user run the playbook
