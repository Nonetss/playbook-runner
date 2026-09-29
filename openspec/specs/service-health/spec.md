# Service Health

## Purpose

Ensure Docker Compose only starts dependent services after their internal
dependencies are ready to receive requests.

## Requirements

### Requirement: Ansible service readiness
The Compose deployment SHALL probe the Ansible service's health endpoint and
shall not start the backend until that probe succeeds. The health endpoint
SHALL be served at `GET /api/health` without any additional route prefix, and
the probe SHALL additionally verify that the Ansible gRPC port (50051) accepts
TCP connections. Both `compose.yml` and `compose.prod.yml` SHALL use the same
probe.

#### Scenario: Ansible becomes ready
- **WHEN** the Ansible service responds successfully to `GET /api/health` and its gRPC port 50051 accepts a TCP connection
- **THEN** Compose SHALL mark it healthy and permit the backend to start

#### Scenario: HTTP up but gRPC not listening
- **WHEN** `GET /api/health` succeeds but a TCP connection to port 50051 is refused
- **THEN** the probe SHALL fail and Compose SHALL NOT mark the Ansible service healthy

#### Scenario: Prefixed legacy path is not used
- **WHEN** a client requests `GET /ansible/api/health`
- **THEN** the service SHALL respond 404, and no compose file or healthcheck SHALL reference that path
