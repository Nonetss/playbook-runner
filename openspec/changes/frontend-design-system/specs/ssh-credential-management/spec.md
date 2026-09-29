## REMOVED Requirements

### Requirement: Credential management is admin-only
**Reason**: The application does not use administrator roles for day-to-day operation; every operator manages the SSH credentials they assign to devices.
**Migration**: None. `create`, `update`, `delete` and `generate` now use `protectedProcedure`; any non-pending authenticated user can call them, and the credentials page always renders its write controls.

## ADDED Requirements

### Requirement: Credential management for authenticated users
The `v1.credentials` `list`, `get`, `create`, `update`, `delete` and `generate` procedures SHALL be available to any non-pending authenticated user. The credentials page SHALL render the create, edit, delete and provisioning controls for every such user.

#### Scenario: Operator creates a credential
- **WHEN** a user with role `user` calls `v1.credentials.create` with valid input
- **THEN** the system SHALL persist the credential with its private key encrypted

#### Scenario: Credentials page shows write actions
- **WHEN** any authenticated, non-pending user opens `/inventory/credentials`
- **THEN** the page SHALL show the create action and each credential SHALL offer edit and delete actions
