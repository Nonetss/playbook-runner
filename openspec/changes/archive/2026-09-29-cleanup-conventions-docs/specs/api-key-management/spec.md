## ADDED Requirements

### Requirement: API key procedure namespace
The API key management procedures (list, create, delete) SHALL be exposed under the `v1.apiKeys` namespace, reachable at `/rpc/v1/apiKeys/<procedure>` and `/api/v1/apiKeys/<procedure>`, and documented in OpenAPI under the "API Keys" tag. They SHALL NOT be exposed under `v1.config`.

#### Scenario: Listing API keys through the new namespace
- **WHEN** an authenticated client calls `v1.apiKeys.list`
- **THEN** the system SHALL return the caller's API key metadata

#### Scenario: Old config namespace is gone
- **WHEN** a client sends a request to `/rpc/v1/config/apiKeys/list`
- **THEN** the system SHALL respond with `NOT_FOUND`
