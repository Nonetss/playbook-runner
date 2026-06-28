# HTTP Server

## Purpose
Compose the application's HTTP surface using Hono, wiring cross-cutting middleware (logging, CORS, session resolution) and mounting the auth, RPC, and documentation routers.

## Requirements

### Requirement: Application composition
The system SHALL compose a single Hono application that mounts the authentication router, the RPC router, and the documentation router, and SHALL respond to `GET /` with a health string.

#### Scenario: Root health endpoint
- **WHEN** a client requests `GET /`
- **THEN** the system SHALL return `"OK"`

### Requirement: Cross-origin resource sharing
The system SHALL apply CORS using the configured origin, allow credentials, permit the `GET`, `POST`, `OPTIONS`, `DELETE`, `PUT`, and `PATCH` methods, and allow the `Content-Type`, `Authorization`, and `x-api-key` request headers.

#### Scenario: Preflight from the configured origin
- **WHEN** a browser sends a CORS preflight from the configured origin
- **THEN** the system SHALL respond allowing credentials and the configured methods and headers

#### Scenario: API key header is permitted
- **WHEN** a cross-origin request includes an `x-api-key` header
- **THEN** CORS SHALL allow the header

### Requirement: Global request logging and session resolution
The system SHALL apply request logging and session resolution middleware to all routes before dispatching to any router.

#### Scenario: Every request resolves a session
- **WHEN** any request reaches the application
- **THEN** the session resolution middleware SHALL run before the route handler so `user` and `session` are available
