# API Documentation

## Purpose
Publish interactive, always-up-to-date API documentation generated from the oRPC router, so consumers can explore endpoints and authenticate test requests correctly.

## Requirements

### Requirement: Interactive documentation UI
The system SHALL serve an interactive API reference using Scalar at `/scalar` and the generated OpenAPI document at `/openapi.json`.

#### Scenario: Documentation UI is reachable
- **WHEN** a client requests `/scalar`
- **THEN** the system SHALL return the Scalar API reference UI

#### Scenario: OpenAPI document is reachable
- **WHEN** a client requests `/openapi.json`
- **THEN** the system SHALL return the generated OpenAPI specification

### Requirement: Documentation reflects the RPC server prefix
The generated specification SHALL declare the API server base path as `/rpc` so example requests and curl snippets target the real RPC endpoints.

#### Scenario: Examples target the correct path
- **WHEN** the documentation renders a request example for a procedure
- **THEN** the example URL SHALL include the `/rpc` prefix

### Requirement: Documented operation metadata
Each procedure SHALL be documented with a summary, a description, and a tag grouping it by area (for example System, API Keys, User).

#### Scenario: Procedure appears under its tag
- **WHEN** the documentation is generated
- **THEN** each procedure SHALL appear with its summary and description under its configured tag

### Requirement: Authentication schemes in documentation
The specification SHALL declare security schemes for an API key passed in the `x-api-key` header and for a Bearer session token, so test requests can be authenticated from the UI.

#### Scenario: User authenticates a test request
- **WHEN** a user opens the authentication panel in the documentation UI
- **THEN** the UI SHALL offer an `x-api-key` field and a Bearer token field
