## ADDED Requirements

### Requirement: Every endpoint declares route metadata

Every oRPC procedure exposed by the app router SHALL declare, via `.route(...)`, a non-empty `summary`, a non-empty `description`, at least one `tag`, and an explicit HTTP `method`. Redundant fields that only restate framework defaults (e.g. `deprecated: false`, default `inputStructure`/`outputStructure`, `successStatus: 200`) SHALL be omitted.

#### Scenario: Procedure exposes complete metadata

- **WHEN** any procedure in the app router is inspected
- **THEN** it SHALL have a `summary`, a `description`, one or more `tags`, and a `method`

#### Scenario: No default-only noise

- **WHEN** a procedure's `.route(...)` is reviewed
- **THEN** it SHALL NOT include fields whose value only restates the framework default

### Requirement: Every endpoint declares a typed response schema

Every oRPC procedure SHALL declare its response with a typed `.output(...)` schema that matches what the handler returns. Response schemas SHALL be defined as reusable Zod schemas per resource and exported as inferred types rather than declared inline and unshared.

#### Scenario: Response is typed

- **WHEN** any procedure is inspected
- **THEN** it SHALL declare a `.output(...)` schema describing its successful response

#### Scenario: Schema matches the handler

- **WHEN** a procedure's handler returns a value
- **THEN** that value SHALL validate against the declared `.output(...)` schema

#### Scenario: Response schemas are reusable

- **WHEN** a resource is returned by more than one endpoint (e.g. get and list)
- **THEN** those endpoints SHALL reference the same shared response schema

### Requirement: Common errors are declared once on the base procedures

The base procedures SHALL declare the errors common to all endpoints exactly once: `publicProcedure` SHALL declare `INTERNAL_SERVER_ERROR`, and `protectedProcedure` SHALL additionally declare `UNAUTHORIZED` and `FORBIDDEN`. Individual endpoints SHALL NOT re-declare these common errors.

#### Scenario: Protected endpoints inherit auth errors

- **WHEN** a protected endpoint is inspected
- **THEN** `UNAUTHORIZED`, `FORBIDDEN`, and `INTERNAL_SERVER_ERROR` SHALL be present without being re-declared on the endpoint

#### Scenario: No duplicated common error blocks

- **WHEN** an endpoint's `.errors(...)` is reviewed
- **THEN** it SHALL NOT repeat the common error codes already declared on its base procedure

### Requirement: Endpoints declare their specific errors

Each endpoint SHALL declare, via `.errors(...)`, the additional error codes it can actually return beyond the common ones (e.g. `NOT_FOUND` for a lookup by id, `BAD_REQUEST`/`CONFLICT` for validation), each with a meaningful message and HTTP status. Endpoints SHALL NOT declare error codes they cannot raise.

#### Scenario: Lookup endpoint declares NOT_FOUND

- **WHEN** an endpoint reads or mutates a resource identified by id
- **THEN** it SHALL declare a `NOT_FOUND` error with an appropriate status

#### Scenario: Only reachable errors are declared

- **WHEN** an endpoint's declared errors are reviewed
- **THEN** each declared error SHALL correspond to a failure the endpoint can actually raise

### Requirement: Generated reference is complete

The OpenAPI document served at `/openapi.json` (and rendered at `/scalar`) SHALL, as a result of the above, describe for every endpoint its summary, description, tags, request, a typed response, and its possible error responses.

#### Scenario: Reference documents responses and errors

- **WHEN** the generated OpenAPI reference is viewed for any endpoint
- **THEN** it SHALL show the endpoint's response schema and its documented error statuses

### Requirement: Documentation standard is written down

The repository SHALL contain a short written standard describing the required documentation shape for an oRPC endpoint (metadata fields, `.output()` schema, `.errors()` usage, and the common-errors-on-base-procedure convention) so new endpoints can follow it without reverse-engineering existing code.

#### Scenario: Standard is discoverable

- **WHEN** a contributor adds a new endpoint
- **THEN** a written standard SHALL be available describing exactly what documentation the endpoint must declare
