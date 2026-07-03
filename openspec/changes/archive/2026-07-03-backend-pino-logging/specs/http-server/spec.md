## MODIFIED Requirements

### Requirement: Global request logging and session resolution

The system SHALL apply request logging and session resolution middleware to all routes before dispatching to any router. Request logging SHALL be emitted through the shared structured logger (not Hono's default logger), producing a leveled, structured entry per request that shares format and level configuration with application logs.

#### Scenario: Every request resolves a session

- **WHEN** any request reaches the application
- **THEN** the session resolution middleware SHALL run before the route handler so `user` and `session` are available

#### Scenario: Every request is logged structurally

- **WHEN** any request reaches the application
- **THEN** a structured request-log entry SHALL be emitted through the shared logger with a severity level, in the same format (JSON in production) as application logs
