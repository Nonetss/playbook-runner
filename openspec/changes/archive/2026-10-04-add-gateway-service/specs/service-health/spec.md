## MODIFIED Requirements

### Requirement: Ansible service readiness
The Compose deployment SHALL probe the Ansible service's health endpoint and
shall not start the backend until that probe succeeds. The health endpoint
SHALL be served at `GET /api/health` without any additional route prefix, and
the probe SHALL additionally verify that the Ansible gRPC port (50051) accepts
TCP connections. Both `compose.yml` and `compose.prod.yml` SHALL use the same
probe. Because the backend reaches the runner through the gateway, Compose
SHALL also not start the backend until the gateway is healthy.

#### Scenario: Ansible becomes ready
- **WHEN** the Ansible service responds successfully to `GET /api/health` and its gRPC port 50051 accepts a TCP connection
- **THEN** Compose SHALL mark it healthy and permit the backend to start once the gateway is also healthy

#### Scenario: HTTP up but gRPC not listening
- **WHEN** `GET /api/health` succeeds but a TCP connection to port 50051 is refused
- **THEN** the probe SHALL fail and Compose SHALL NOT mark the Ansible service healthy

#### Scenario: Prefixed legacy path is not used
- **WHEN** a client requests `GET /ansible/api/health`
- **THEN** the service SHALL respond 404, and no compose file or healthcheck SHALL reference that path

## ADDED Requirements

### Requirement: Gateway and frontend readiness
Both `compose.yml` and `compose.prod.yml` SHALL probe the gateway at `GET /health` on its gRPC port and the frontend at `GET /login` on its own port (`4321`, inside its container), using the same probes in both files. The gateway SHALL NOT depend on any other service to start, so it can be healthy before the backend.

#### Scenario: Gateway starts first
- **WHEN** the stack is started from scratch
- **THEN** the gateway SHALL become healthy without waiting for the backend or frontend, and the backend SHALL start after both the gateway and the Ansible service are healthy

#### Scenario: Frontend health is probed directly
- **WHEN** Astro SSR responds 200 to `GET http://localhost:4321/login` inside the frontend container
- **THEN** Compose SHALL mark the frontend healthy
