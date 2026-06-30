## 1. Backend: resolve run procedure

- [x] 1.1 Add a `resolveRun` handler in `packages/api/src/handlers` that, given `playbookId` and a selection of `{id, type}`, loads the playbook, expands group ids to device ids via `inventory_device_groups`, merges with directly-selected device ids, de-duplicates, and joins each device to its credential.
- [x] 1.2 Derive each host's `address` from `inventory_devices.ip_address` (cidr → host string) and include `portSSH`/`port_ssh` when present.
- [x] 1.3 Return `{ playbook: { name, content }, hosts: [{ name, address, port?, username, privateKey, connection: "ssh" }] }`; throw not-found for an unknown playbook and an error for a device with no credential.
- [x] 1.4 Expose it as a protected oRPC procedure (`run.resolve` or `playbooks.resolveRun`) with a zod input/output schema in `packages/api/src/routers`, and register it in the router index.
- [x] 1.5 Type-check the API package and confirm the procedure appears in the generated RPC surface.

## 2. Ansible service: backend client + config

- [x] 2.1 Add settings for the run scratch directory (and any resolve endpoint path) in `apps/ansible/app/core/config.py`.
- [x] 2.2 Add a helper that calls the backend resolve procedure over `httpx`, forwarding the incoming session cookie, and parses the bundle into pydantic models (playbook + hosts).
- [x] 2.3 Map a resolver/backend error (not-found, credential-less device, unreachable backend) to an appropriate HTTP/SSE error.

## 3. Ansible service: materialization

- [x] 3.1 Write the resolved playbook `content` to a uniquely-named playbook file under a per-run directory.
- [x] 3.2 Write each distinct credential's private key to a `0600` key file and map device → key file path.
- [x] 3.3 Build the `Inventory` JSON with per-host `HostVars` (`ansible_host`, `ansible_user`, `ansible_port`, `ansible_ssh_private_key_file`, `ansible_connection: "ssh"`).
- [x] 3.4 Delete the materialized playbook and key files in a `finally` after the run.

## 4. Ansible service: run endpoint

- [x] 4.1 Extract shared SSE helpers (`_sse`, `_event_payload`) from `ping.py` into a reusable module.
- [x] 4.2 Implement `POST /api/v0/run`: depend on `CurrentUser`, resolve the bundle, materialize files, build `AnsibleRunnerConfig`, and stream events via `AnsibleRunner.stream()` as `StreamingResponse(media_type="text/event-stream")` with a terminal `done` event and `error` event on failure.
- [x] 4.2b Remove the unused synchronous `RunResponse` model now that the endpoint streams.
- [x] 4.3 Mount the `run` router under `/v0` in `apps/ansible/app/api/routes/routes.py`.

## 5. Verification

- [x] 5.1 Run the Ansible service and exercise `POST /api/v0/run` with a real playbook + a device selection and a group selection; confirm events stream and a `done` event arrives.
- [x] 5.2 Confirm credential-less device and unknown-playbook selections produce clear errors and no partial run.
- [x] 5.3 Confirm materialized key/playbook files are removed after the run (success and failure paths).
