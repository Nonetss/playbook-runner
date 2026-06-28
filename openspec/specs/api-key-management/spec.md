# API Key Management

## Purpose
Allow authenticated users to create API keys and use them as an alternative credential, so that programmatic clients can authenticate without a browser session. Built on the Better Auth API Key plugin.

## Requirements

### Requirement: API key plugin enabled
The system SHALL enable the Better Auth API Key plugin on both the server and the auth client, and SHALL persist API keys in the `apikey` table containing at least `configId`, `referenceId`, `key`, `enabled`, `expiresAt`, and rate-limit fields.

#### Scenario: API key schema is available
- **WHEN** the application starts with the API Key plugin configured
- **THEN** the `apikey` table SHALL exist with the fields required by the plugin, including `config_id` and `reference_id`

### Requirement: Create an API key
The system SHALL allow an authenticated user to create an API key. The created key SHALL belong to the requesting user, use the `default` configuration, and expire 30 days after creation.

#### Scenario: Authenticated user creates a key
- **WHEN** a user with an active session calls the create-API-key operation
- **THEN** the system SHALL return a new API key whose `referenceId` is the user's id and whose expiry is 30 days out

#### Scenario: Unauthenticated create attempt
- **WHEN** a request without a valid session calls the create-API-key operation
- **THEN** the system SHALL reject it as unauthorized

### Requirement: Session from API key
The system SHALL accept an API key supplied in the `x-api-key` header as a valid credential and resolve it to the owning user's session. This requires `enableSessionForAPIKeys` to be enabled on the plugin.

#### Scenario: Request authenticated with an API key
- **WHEN** a request includes a valid `x-api-key` header and no session cookie
- **THEN** session resolution SHALL return the user that owns the API key

#### Scenario: Request with an invalid API key
- **WHEN** a request includes an `x-api-key` header that does not match any enabled key
- **THEN** session resolution SHALL NOT return a user

### Requirement: API key verification
The system SHALL be able to verify an API key and report whether it is valid along with the key's metadata (excluding the raw key value).

#### Scenario: Verifying a valid key
- **WHEN** a valid key is passed to the verify operation
- **THEN** the result SHALL indicate `valid: true` and include the key's `referenceId`
