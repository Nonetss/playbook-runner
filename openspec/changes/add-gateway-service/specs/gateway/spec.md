## Purpose

Provide a single, standalone entry point that maps every request to the app that serves it: public HTTP for the browser (backend API and frontend on one origin) and an internal gRPC router that every gRPC client dials.

## ADDED Requirements

### Requirement: Single public HTTP entry point
The Docker deployment SHALL expose the application through a dedicated gateway service that is the only service publishing a host port in `compose.yml` and `compose.prod.yml`. The gateway SHALL forward `/rpc/*`, `/api/*`, `/scalar*` and `/openapi.json` to the backend and every other path to the frontend, so the browser talks to one origin and never makes cross-origin calls. Responses SHALL be compressed (zstd or gzip) when the client accepts it.

#### Scenario: API request reaches the backend
- **WHEN** a browser requests `GET /api/v1/health/check` on the published port
- **THEN** the gateway SHALL forward it to the backend and return the backend's response

#### Scenario: Page request reaches the frontend
- **WHEN** a browser requests `GET /login` on the published port
- **THEN** the gateway SHALL forward it to the frontend and return the rendered page

#### Scenario: Documentation is served through the gateway
- **WHEN** a client requests `GET /scalar` or `GET /openapi.json` on the published port
- **THEN** the gateway SHALL forward it to the backend

#### Scenario: Published port is unchanged for existing installs
- **WHEN** an operator's `.env` sets only `FRONTEND_PORT` (no `GATEWAY_PORT`)
- **THEN** the gateway SHALL be published on that port, and with neither set it SHALL be published on `4321`

### Requirement: Frontend is not directly reachable
The frontend container SHALL run only the Astro SSR server (no embedded reverse proxy) on port `4321`, and SHALL NOT publish any host port; it SHALL only be reachable on the compose network.

#### Scenario: Default stack does not publish the frontend
- **WHEN** the stack is started with `docker compose up`
- **THEN** no host port SHALL map to the frontend container, and the gateway SHALL still reach it at `frontend:4321`

### Requirement: Internal gRPC router
The gateway SHALL listen for gRPC (HTTP/2 cleartext) on port `50050`, reachable only on the compose network and never published to the host. It SHALL route each call by its proto package (the `/<package>.<Service>/<Method>` path prefix) to the single app that serves that package: package `run` SHALL route to the Ansible runner. Server-streaming responses SHALL be relayed message by message without buffering, request metadata (including the service token) SHALL be forwarded unchanged, and gRPC status codes and trailers from the upstream SHALL reach the caller unchanged.

#### Scenario: Run call is routed to the runner
- **WHEN** the backend calls `/run.RunnerService/RunPing` on `gateway:50050` with a valid service token
- **THEN** the call SHALL reach the Ansible runner and each streamed event SHALL reach the backend as soon as the runner emits it

#### Scenario: Upstream status is preserved
- **WHEN** the runner rejects a call with `RESOURCE_EXHAUSTED` or `UNAUTHENTICATED`
- **THEN** the backend SHALL receive that same gRPC status through the gateway

#### Scenario: Caller cancels a stream
- **WHEN** the backend cancels an in-flight `RunBundle` call made through the gateway
- **THEN** the cancellation SHALL propagate to the runner, which SHALL stop the run as it does for a direct call

#### Scenario: Unknown service
- **WHEN** a client calls a method whose package has no route in the gateway
- **THEN** the gateway SHALL answer with gRPC status `UNIMPLEMENTED` and a message stating there is no route for that service

#### Scenario: Runner is not reachable from outside
- **WHEN** a client on the host sends any request to the published HTTP port
- **THEN** no path SHALL reach the Ansible runner

### Requirement: Gateway health endpoint
The gateway SHALL answer `GET /health` on its gRPC port with HTTP 200, independently of whether its upstreams are up, so compose can probe it without creating a dependency cycle.

#### Scenario: Gateway health probe
- **WHEN** a probe requests `GET http://localhost:50050/health` inside the gateway container
- **THEN** the gateway SHALL respond 200

### Requirement: Published gateway image
CI SHALL build the gateway image for amd64 and arm64 and push it to the container registry with the same tagging scheme as the other images (`latest`, the ref name, and `<ref>-<sha8>`), and `compose.prod.yml` SHALL pull it with a tag overridable through `GATEWAY_IMAGE_TAG`.

#### Scenario: Release tag publishes the gateway
- **WHEN** a `v*` tag is pushed
- **THEN** `playbook-runner-gateway` SHALL be pushed with that tag alongside the backend, ansible and frontend images
