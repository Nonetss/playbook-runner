# Service Health

## Purpose

Ensure Docker Compose only starts dependent services after their internal
dependencies are ready to receive requests.

## Requirements

### Requirement: Ansible service readiness
The Compose deployment SHALL probe the Ansible service's health endpoint and
shall not start the backend until that probe succeeds.

#### Scenario: Ansible becomes ready
- **WHEN** the Ansible service responds successfully to `GET /api/health`
- **THEN** Compose SHALL mark it healthy and permit the backend to start
