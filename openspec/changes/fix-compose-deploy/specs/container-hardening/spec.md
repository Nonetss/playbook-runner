## ADDED Requirements

### Requirement: Internal-only runner exposure
The Ansible runner service SHALL NOT publish its HTTP (8000) or gRPC (50051)
ports to the Docker host in the default `compose.yml` or in
`compose.prod.yml`; it SHALL only `expose` them on the compose network. Host
publication of port 8000 SHALL be available only through an explicit opt-in
overlay file (`compose.debug.yml`).

#### Scenario: Default stack does not publish the runner
- **WHEN** the stack is started with `docker compose up`
- **THEN** no host port SHALL map to the Ansible container, and the backend SHALL still reach it at `ansible:50051`

#### Scenario: Developer opts in to debugging
- **WHEN** the stack is started with `docker compose -f compose.yml -f compose.debug.yml up`
- **THEN** port 8000 of the Ansible container SHALL be published on the host

### Requirement: SSH host key verification policy
The Ansible service SHALL apply a single SSH host key verification policy to
every run (playbook, ad-hoc command, script, ping), selected by the
`SSH_HOST_KEY_POLICY` setting with values `accept-new` (default), `strict`, or
`off`. The same default SHALL apply in local development and in Docker; the
container image SHALL NOT hardcode `ANSIBLE_HOST_KEY_CHECKING`. Accepted host
keys SHALL be stored in a `known_hosts` file under the service's persistent
state directory so they survive container restarts.

#### Scenario: First connection with accept-new
- **WHEN** the policy is `accept-new` and a run targets a host not present in `known_hosts`
- **THEN** the connection SHALL succeed and the host key SHALL be appended to `known_hosts`

#### Scenario: Changed host key is rejected
- **WHEN** the policy is `accept-new` or `strict` and a host presents a key different from the one recorded in `known_hosts`
- **THEN** the connection to that host SHALL fail and the run SHALL report the host as unreachable

#### Scenario: Strict policy with unknown host
- **WHEN** the policy is `strict` and a run targets a host not present in `known_hosts`
- **THEN** the connection to that host SHALL fail

#### Scenario: Explicit opt-out
- **WHEN** the policy is `off`
- **THEN** host keys SHALL NOT be verified and the service SHALL log a warning at startup stating that host key checking is disabled

#### Scenario: Invalid policy value
- **WHEN** `SSH_HOST_KEY_POLICY` is set to a value other than `accept-new`, `strict`, or `off`
- **THEN** the service SHALL fail to start with a configuration error

### Requirement: Persistent runner state directory
The Ansible service SHALL read a `STATE_DIR` setting identifying a writable
directory for state that must outlive a single run (currently `known_hosts`).
In Docker it SHALL be backed by a named volume; in local development it SHALL
default to the ignored root directory `.data/ansible-runner/`. Per-run
material (inventories, private keys, artifacts) SHALL remain in
`RUN_SCRATCH_DIR` and SHALL NOT be written to `STATE_DIR`.

#### Scenario: known_hosts survives restart
- **WHEN** a host key is accepted during a run and the Ansible container is then recreated
- **THEN** the next run against that host SHALL find the key in `STATE_DIR/known_hosts`

### Requirement: Non-root runner container
The Ansible container image SHALL run its process as a dedicated non-root
user, and `STATE_DIR` and `RUN_SCRATCH_DIR` SHALL be writable by that user.

#### Scenario: Process user
- **WHEN** the Ansible container is running
- **THEN** the FastAPI/gRPC process SHALL NOT run with UID 0

#### Scenario: Run can write scratch and state
- **WHEN** a run materialises keys in `RUN_SCRATCH_DIR` and accepts a host key into `STATE_DIR/known_hosts`
- **THEN** both writes SHALL succeed without permission errors

### Requirement: Reproducible runner image build
The Ansible Dockerfile SHALL reference the `uv` build image by an explicit
version tag and SHALL NOT use `latest`.

#### Scenario: Pinned build tool
- **WHEN** the Ansible Dockerfile is inspected
- **THEN** the `COPY --from=ghcr.io/astral-sh/uv:<tag>` instruction SHALL use a fixed version tag
