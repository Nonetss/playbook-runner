## ADDED Requirements

### Requirement: Frontend features have explicit ownership
The frontend SHALL place domain feature modules directly under `src/features`, with
feature-specific components, hooks, and types owned by their feature rather than by
the generic component namespace.

#### Scenario: Developer locates a domain feature
- **WHEN** a developer navigates to a frontend domain implementation
- **THEN** its feature-specific code is available under `src/features/<feature>`

### Requirement: Execution behavior is domain-neutral
The frontend SHALL provide shared execution stream types, hooks, selection behavior,
and console UI from a neutral `run` feature.

#### Scenario: Non-playbook flow consumes execution behavior
- **WHEN** a script, command, or inventory flow uses execution streaming
- **THEN** it imports the shared behavior from `src/features/run` without depending
  on the playbooks feature

### Requirement: Shared primitives remain separate from features
The frontend SHALL keep generic reusable UI and resource primitives under
`src/components` while feature-owned UI remains under `src/features`.

#### Scenario: Generic component is reused
- **WHEN** multiple unrelated features consume a generic UI primitive
- **THEN** the primitive is owned by `src/components/ui` or
  `src/components/shared`

### Requirement: Mutable Ansible state is separate from source
The repository SHALL store local mutable Ansible runner data in an ignored root data
directory rather than inside the Ansible application's source tree.

#### Scenario: Ansible produces execution artifacts
- **WHEN** the local or containerized Ansible runner writes inventory, credentials,
  or execution artifacts
- **THEN** those files are stored below `.data/ansible-runner` and remain untracked

### Requirement: Empty feature folders are not mandatory
Repository conventions SHALL require feature subdirectories only when the
subdirectory owns files.

#### Scenario: Feature has no custom hooks
- **WHEN** a frontend feature contains no feature-specific hooks
- **THEN** the feature remains valid without an empty `hooks` directory
