## Why

The frontend feature tree currently mixes feature modules beneath a component-only
namespace and creates cross-feature dependencies on the playbooks feature. Runtime
Ansible state also lives inside the service source tree, making code and mutable
execution data harder to distinguish.

## What Changes

- Promote frontend feature modules from `src/components/features` to
  `src/features`.
- Introduce a shared `run` feature for execution hooks, types, and console UI used
  by playbooks, scripts, commands, and inventory.
- Rename vague frontend features to `app-shell` and `diagnostics`.
- Keep reusable primitives under `src/components` and stop requiring empty feature
  subdirectories.
- Move ignored Ansible runtime state to a root `.data/ansible-runner` directory and
  update local/Docker configuration to use it.

## Capabilities

### New Capabilities

- `project-organization`: Defines ownership and placement rules for frontend
  features, shared execution UI, and mutable service runtime data.

### Modified Capabilities

None.

## Impact

This affects frontend import paths and feature ownership, the Ansible runtime data
location, Docker Compose volume configuration, ignore rules, and repository agent
documentation. Public routes, RPC procedures, database schemas, and deployed API
behavior remain unchanged.
