## Purpose

Let a developer start the whole application (frontend, backend, Ansible runner and gateway) in Docker with hot reload through a single `bun run dev`, behaving like native development.

## ADDED Requirements

### Requirement: One command starts the Docker dev stack
`bun run dev` SHALL build and start the frontend, backend, Ansible runner and gateway from source in Docker and keep watching for changes until stopped with Ctrl+C; `bun run dev:down` SHALL remove those containers. The native Turbo workflow SHALL remain available as `bun run dev:local`, and `bun run gateway` SHALL start only the dev gateway so native apps can use it.

#### Scenario: Start the dev stack
- **WHEN** a developer with filled `apps/*/.env` files and a reachable PostgreSQL runs `bun run dev`
- **THEN** the app SHALL be served at `http://localhost:4321` and signing in with the seeded admin SHALL work

#### Scenario: Stop and clean up
- **WHEN** the developer runs `bun run dev:down`
- **THEN** the dev containers SHALL be removed

#### Scenario: Native workflow still available
- **WHEN** the developer runs `bun run gateway` and `bun run dev:local`
- **THEN** the apps SHALL run natively and reach the runner through the dev gateway as in the Docker dev stack

### Requirement: Hot reload without bind mounts
Source edits SHALL reach the running containers without bind-mounting the repository, so each container keeps its own installed dependencies and generated gRPC stubs. Edits to app or shared package sources SHALL be picked up by each app's own reload mechanism; edits to dependency manifests, lockfiles or `proto/` SHALL rebuild the affected images; edits to the gateway's routing config SHALL restart the gateway.

#### Scenario: Frontend edit reloads
- **WHEN** a developer edits a file under `apps/frontend/src` while `bun run dev` is running
- **THEN** the change SHALL be visible in the browser without restarting the stack

#### Scenario: Shared package edit reaches the backend
- **WHEN** a developer edits a file under `packages/api/src`
- **THEN** the backend SHALL reload with the change

#### Scenario: Runner edit reloads
- **WHEN** a developer edits a file under `apps/ansible/app`
- **THEN** the Ansible service SHALL reload with the change

#### Scenario: Proto change rebuilds
- **WHEN** a developer edits a file under `proto/`
- **THEN** the backend and Ansible images SHALL be rebuilt with regenerated stubs

### Requirement: Address parity with native development
Every dev container SHALL use the host network and read its app's `.env` file unchanged, so the services reach each other, the database and the gateway at the same `localhost` addresses and ports as native development: frontend `:4321`, backend `:3000`, Ansible HTTP `:8000` and gRPC `:50051`, gateway gRPC `:50050`, and the gateway's HTTP site on `:8080` (never the host's port 80). The Docker dev stack and the native workflow SHALL NOT be run at the same time.

#### Scenario: Backend reaches the runner through the gateway
- **WHEN** the dev stack is running with the default `ANSIBLE_GRPC_TARGET`
- **THEN** the backend SHALL reach the runner through the gateway at `localhost:50050`

#### Scenario: Production-like routing in dev
- **WHEN** a developer opens `http://localhost:8080` while the dev stack is running
- **THEN** the gateway SHALL serve the app with the same routing rules as production

### Requirement: Persistent runner state in dev
The Ansible runner's persistent state (`known_hosts` and Git mirrors) in the Docker dev stack SHALL survive container rebuilds and restarts.

#### Scenario: Host key survives a rebuild
- **WHEN** a host key is accepted during a dev run and the Ansible dev image is then rebuilt
- **THEN** the next dev run against that host SHALL find the key already recorded
