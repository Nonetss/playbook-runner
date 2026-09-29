# SSH Credential Management

## Purpose

Manage SSH credentials used by Ansible runs securely: let any authenticated operator manage them, never expose private keys through the API, and encrypt private keys at rest.

## Requirements

### Requirement: Private keys are never returned
No credentials procedure SHALL include the private key in its response. Responses SHALL contain `id`, `name`, `username`, `publicKey`, `createdAt` and `updatedAt`. The private key SHALL be optional on `update`; when omitted, the stored key SHALL be kept unchanged. The `generate` procedure is the only one that returns a private key, and only for the freshly generated, not-yet-persisted pair.

#### Scenario: Listing credentials
- **WHEN** any client calls `v1.credentials.list` or `v1.credentials.get`
- **THEN** no returned object SHALL contain a `privateKey` field

#### Scenario: Update without a new key
- **WHEN** a user calls `v1.credentials.update` with a name change and no `privateKey`
- **THEN** the name SHALL be updated and the stored private key SHALL remain the same

### Requirement: Private keys are encrypted at rest
The system SHALL encrypt credential private keys with AES-256-GCM before storing them, using a key supplied by the required `CREDENTIALS_ENCRYPTION_KEY` environment variable, and SHALL decrypt them only when building a run for the Ansible service. Stored values SHALL be self-describing (versioned prefix) so plaintext legacy rows can be detected.

#### Scenario: New credential is stored encrypted
- **WHEN** a user creates a credential
- **THEN** the database column SHALL contain a versioned ciphertext and not the PEM text

#### Scenario: Run uses the decrypted key
- **WHEN** a run is resolved for a device that uses an encrypted credential
- **THEN** the Ansible service SHALL receive the original PEM private key

#### Scenario: Missing encryption key
- **WHEN** the backend starts without `CREDENTIALS_ENCRYPTION_KEY` (and env validation is not skipped)
- **THEN** startup SHALL fail with an environment validation error

#### Scenario: Legacy plaintext rows are re-encrypted
- **WHEN** the operator runs the credential re-encryption script
- **THEN** every plaintext private key SHALL be replaced by its ciphertext and already-encrypted rows SHALL be left untouched

### Requirement: Credential management for authenticated users
The `v1.credentials` `list`, `get`, `create`, `update`, `delete` and `generate` procedures SHALL be available to any non-pending authenticated user. The credentials page SHALL render the create, edit, delete and provisioning controls for every such user.

#### Scenario: Operator creates a credential
- **WHEN** a user with role `user` calls `v1.credentials.create` with valid input
- **THEN** the system SHALL persist the credential with its private key encrypted

#### Scenario: Credentials page shows write actions
- **WHEN** any authenticated, non-pending user opens `/inventory/credentials`
- **THEN** the page SHALL show the create action and each credential SHALL offer edit and delete actions
