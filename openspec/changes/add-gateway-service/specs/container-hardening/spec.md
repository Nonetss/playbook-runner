## MODIFIED Requirements

### Requirement: Internal-only runner exposure
The Ansible runner service SHALL NOT publish its HTTP (8000) or gRPC (50051)
ports to the Docker host in the default `compose.yml` or in
`compose.prod.yml`; it SHALL only `expose` them on the compose network. The
backend SHALL reach the runner's gRPC service through the gateway's internal
gRPC router (`gateway:50050`), which is not published either. Host
publication of port 8000 SHALL be available only through an explicit opt-in
overlay file (`compose.debug.yml`).

#### Scenario: Default stack does not publish the runner
- **WHEN** the stack is started with `docker compose up`
- **THEN** no host port SHALL map to the Ansible container, and the backend SHALL still reach it through `gateway:50050`

#### Scenario: Developer opts in to debugging
- **WHEN** the stack is started with `docker compose -f compose.yml -f compose.debug.yml up`
- **THEN** port 8000 of the Ansible container SHALL be published on the host
