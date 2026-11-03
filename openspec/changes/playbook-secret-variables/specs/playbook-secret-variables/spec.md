## Purpose

Lets operators declare which Infisical secrets a playbook needs and use them as plain Ansible variables, with values fetched by the runner, never stored by Playbook Runner and masked in run output.

## ADDED Requirements

### Requirement: A playbook can declare secret variables
A playbook SHALL be able to store one Infisical connection, a default environment slug, and a list of secret variables, each with a variable name, a secret name and a secret path that defaults to `/`. Inline and Git-sourced playbooks SHALL both support this, and a repository sync SHALL NOT change it. Any authenticated, non-pending user SHALL be able to read and replace the declaration.

#### Scenario: Saving a declaration
- **WHEN** a user saves a connection, an environment and a list of variables on a playbook
- **THEN** the declaration SHALL replace the previous one and be returned

#### Scenario: Git-sourced playbook
- **WHEN** a user saves a declaration on a Git-sourced playbook
- **THEN** it SHALL be stored even though the playbook's content stays read-only

#### Scenario: Clearing a declaration
- **WHEN** a user saves a declaration with no connection
- **THEN** the playbook SHALL have no secret variables

#### Scenario: Variables without a connection
- **WHEN** a user saves variables without a connection or without an environment
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL change

#### Scenario: Unknown connection
- **WHEN** a user saves a declaration with a connection id that does not exist
- **THEN** the call SHALL fail with `BAD_REQUEST` and nothing SHALL change

### Requirement: Variable names are restricted
A secret variable name, on a playbook, a job or an interactive run, SHALL follow the same rule as user extra vars: an identifier that does not start with `ansible_`, in any letter case. Names SHALL be unique within a declaration.

#### Scenario: Reserved name
- **WHEN** a user saves a variable named `ansible_host` or `ANSIBLE_ssh_args`
- **THEN** the call SHALL fail with `BAD_REQUEST`

#### Scenario: Duplicate name
- **WHEN** a user saves two variables with the same name
- **THEN** the call SHALL fail with `BAD_REQUEST`

### Requirement: The connection and environment can be chosen per run or job
An interactive playbook run and a job SHALL accept an optional connection and an optional environment slug, which override the playbook's for every secret variable of that run. A run SHALL read all its secrets through one connection and one environment. A slug SHALL contain only letters, digits, `-` and `_`.

#### Scenario: Interactive override
- **WHEN** a user runs a playbook whose default is `dev` and chooses `prod`
- **THEN** the secrets SHALL be read from `prod`

#### Scenario: Job override
- **WHEN** a job with environment `prod` runs a playbook whose default is `dev`
- **THEN** the secrets SHALL be read from `prod`

#### Scenario: No override
- **WHEN** a run or job chooses no environment
- **THEN** the secrets SHALL be read from the playbook's default environment

#### Scenario: Connection override
- **WHEN** a user runs a playbook declaring a connection and chooses another
- **THEN** every secret of that run, including those the playbook declares, SHALL be read through the chosen connection

#### Scenario: Nothing to read from
- **WHEN** a run has secret variables but neither the run nor the playbook provides a connection, or an environment
- **THEN** an interactive run or a job save SHALL fail with `BAD_REQUEST` and no run SHALL start

#### Scenario: Invalid slug
- **WHEN** a user supplies an environment containing other characters
- **THEN** the call SHALL fail with `BAD_REQUEST`

### Requirement: A run or job can add secret variables
An interactive playbook run and a job SHALL accept a list of secret variables in the same form as a playbook's. The variables of a run SHALL be the playbook's plus these, and an entry with the name of a playbook variable SHALL replace that variable's secret for the run. A job SHALL store only its own entries, so later changes to the playbook's declaration reach the job. Scripts, ad-hoc commands and pings SHALL NOT accept secret variables.

#### Scenario: Adding a variable to one run
- **WHEN** a user runs a playbook declaring `db_password` and adds `api_token`
- **THEN** that run SHALL receive both, and the next run SHALL NOT receive `api_token` unless it is added again

#### Scenario: Pointing a declared variable at another secret
- **WHEN** a user runs a playbook declaring `db_password` and sets `db_password` to another secret
- **THEN** that run SHALL use the chosen secret and the playbook's declaration SHALL NOT change

#### Scenario: Job keeps its variables
- **WHEN** a user saves a job with its own secret variable
- **THEN** the job SHALL return it and every run of the job SHALL receive it

#### Scenario: Playbook gains a variable after the job is saved
- **WHEN** a playbook used by a job declares a new secret variable
- **THEN** the job's next run SHALL receive it without editing the job

### Requirement: Secret variables reach the playbook
For a playbook with secret variables, the system SHALL fetch every declared secret before Ansible starts and SHALL make each one available to the playbook as a variable of its declared name, across all plays and hosts. Values SHALL be used literally: text such as `{{ x }}` in a secret SHALL NOT be evaluated. Values SHALL NOT be sent to the backend, written to the database or returned by any procedure. Any file holding values SHALL be readable only by the runner's user and removed when the run ends.

#### Scenario: Using a variable
- **WHEN** a playbook declares `db_password` and a task references `{{ db_password }}`
- **THEN** the task SHALL receive the secret's value, with no lookup in the playbook

#### Scenario: Value that looks like a template
- **WHEN** a secret's value contains `{{ 7*6 }}` or `{% raw %}`
- **THEN** the playbook SHALL receive that exact text and the run SHALL NOT fail on it

#### Scenario: Scheduled job
- **WHEN** the scheduler runs a job whose playbook has secret variables
- **THEN** the run SHALL receive them exactly as an interactive run does

#### Scenario: Playbook without secret variables
- **WHEN** neither a playbook nor its run or job has secret variables
- **THEN** the runner SHALL contact no Infisical instance and the run SHALL behave as it does today

#### Scenario: Run ends
- **WHEN** a run with secret variables ends, fails or is cancelled
- **THEN** no file holding a value SHALL remain

### Requirement: Secret fetch failures stop the run
If any declared secret cannot be fetched, the system SHALL NOT start Ansible and SHALL report an error that names the failing variable or the failing step, and never a value. The fetch SHALL be bounded by a timeout.

#### Scenario: Missing secret
- **WHEN** a declared secret does not exist in the chosen environment and path
- **THEN** the run SHALL fail before Ansible starts with an error naming that variable

#### Scenario: Value not readable
- **WHEN** the identity may see the secret but not read its value
- **THEN** the run SHALL fail before Ansible starts with an error naming that variable

#### Scenario: Instance unreachable or bad credentials
- **WHEN** Infisical cannot be reached in time or rejects the credentials
- **THEN** the run SHALL fail before Ansible starts with an error describing the problem

#### Scenario: Connection without a project
- **WHEN** a run with secret variables uses a connection that has no project id
- **THEN** the run SHALL fail with `PRECONDITION_FAILED` for an interactive run, and as the run's error for a job

### Requirement: Extra vars cannot collide with secret variables
A run whose extra vars contain the name of one of its secret variables, whether declared by the playbook or added by the run or job, SHALL be refused before it starts, because an extra var would otherwise silently replace the secret.

#### Scenario: Interactive collision
- **WHEN** a user runs a playbook declaring `db_password` with an extra var `db_password`
- **THEN** the call SHALL fail with `BAD_REQUEST` and no run SHALL start

#### Scenario: Job collision
- **WHEN** a job has an extra var with the name of a secret variable of its playbook, added to the playbook after the job was saved
- **THEN** the job run SHALL fail with an error naming the variable and Ansible SHALL NOT start

### Requirement: Fetched values are masked in run output
The runner SHALL replace every fetched value of at least 4 characters with a fixed mask in every string of the run's events, and in its logs, before they leave the runner. Shorter values SHALL NOT be masked, because masking them would corrupt unrelated output. The runner SHALL NOT write Ansible's raw display to its own output for these runs. This masking SHALL NOT be presented as covering transformed values.

#### Scenario: Task prints a secret
- **WHEN** a task's `msg`, `stdout` or `stderr` contains a fetched value literally
- **THEN** the event sent to the backend, the run history and the runner's logs SHALL contain the mask instead

#### Scenario: Very short value
- **WHEN** a fetched value has fewer than 4 characters
- **THEN** it SHALL still reach the playbook and SHALL NOT be masked

### Requirement: Pickers list environments and secret names
The system SHALL let any authenticated, non-pending user list a connection's environments and the secret names at an environment and path. These procedures SHALL never return secret values. When environments cannot be listed, the environment SHALL remain enterable as text.

#### Scenario: Listing secret names
- **WHEN** a user lists secrets for a connection, an environment and a path
- **THEN** the response SHALL contain the names and no values

#### Scenario: Environments unavailable
- **WHEN** the Infisical instance does not provide the environment list
- **THEN** the call SHALL return an empty list and the form SHALL accept a typed slug

#### Scenario: Infisical failure
- **WHEN** Infisical is unreachable or rejects the credentials while listing secret names
- **THEN** the call SHALL fail with `BAD_GATEWAY` and a message that contains no credentials

#### Scenario: Unknown connection
- **WHEN** a user lists for a connection id that does not exist
- **THEN** the call SHALL fail with `NOT_FOUND`

### Requirement: Operators manage secret variables from the playbook page
The playbook edit page SHALL offer a section to choose the connection and default environment and to add, edit and remove variables, choosing each secret from the picker. Choosing a secret on an empty row SHALL suggest a variable name. A secret that is no longer listed SHALL stay visible in its row.

#### Scenario: Declaring from the page
- **WHEN** a user chooses a connection, an environment and a secret, then saves
- **THEN** the row SHALL be stored with the suggested or edited variable name

#### Scenario: Git-sourced playbook page
- **WHEN** a user opens a Git-sourced playbook
- **THEN** the content SHALL stay read-only and the secret variables section SHALL stay editable

### Requirement: Variables can be chosen from Infisical on the run page and job form
The run page and job form SHALL offer a connection select and, once a connection is effective, an environment select. Each variable row SHALL hold either typed text, sent as an extra var, or a secret chosen from the picker, sent as a secret variable. Rows SHALL start from the playbook's declared variables, filled in and marked as coming from the playbook; those rows SHALL allow choosing another secret but not removal. The secret option SHALL be available only when a connection and an environment are effective, and without one the rows SHALL work as typed text.

#### Scenario: Declared variables are filled in
- **WHEN** a user opens the run page of a playbook declaring `db_password`
- **THEN** a row for `db_password` SHALL show its secret and the playbook's connection and environment SHALL be selected

#### Scenario: Choosing a secret for a new variable
- **WHEN** a user adds a variable, switches it to a secret and chooses one from the picker
- **THEN** the run SHALL send it as a secret variable, and no value SHALL be shown or sent by the browser

#### Scenario: Typed value
- **WHEN** a user adds a variable and types a value
- **THEN** the run SHALL send it as an extra var

#### Scenario: No connection
- **WHEN** no connection exists or none is selected and the playbook declares no variables
- **THEN** rows SHALL accept only typed text and no secret SHALL be listed

#### Scenario: Listing fails
- **WHEN** the secrets of the selected connection cannot be listed
- **THEN** the form SHALL show the problem, and typed values and rows already chosen SHALL remain usable

#### Scenario: Saved job reopened
- **WHEN** a user reopens a job with its own secret variables
- **THEN** its rows SHALL show them, alongside the variables its playbook declares
