## Context

The Astro frontend organizes complete feature modules below
`src/components/features`, even though those modules also own hooks and types.
Several execution flows import shared stream types from the playbooks feature, and
the shared run console imports the same feature directly. Separately, the Ansible
service stores ignored inventories, credentials, and runner artifacts below its
source directory.

## Goals / Non-Goals

**Goals:**

- Make feature ownership visible from directory paths.
- Give shared execution behavior a neutral home independent of playbooks.
- Use descriptive names for application-shell and diagnostic concerns.
- Separate mutable Ansible runner state from application source.
- Preserve routes, behavior, aliases, and public package boundaries.

**Non-Goals:**

- Changing UI behavior or visual design.
- Changing API, gRPC, authentication, or database contracts.
- Reorganizing backend feature layering or introducing new workspaces.
- Moving the single shared Python package before more Python packages exist.

## Decisions

1. Frontend feature modules will live directly under `src/features`. The existing
   `@/` alias remains unchanged, so imports become `@/features/...`.
2. Execution stream types, hooks, inventory-selection behavior, and the run console
   will live under `features/run`. Domain pages remain in their existing features.
   This avoids making scripts, commands, or inventory depend on playbooks.
3. `global` becomes `app-shell`, while `try` becomes `diagnostics`. These names
   communicate responsibility without splitting small cohesive modules further.
4. Reusable UI primitives remain in `src/components/ui` and generic resource
   building blocks remain in `src/components/shared`.
5. Runtime state moves to `.data/ansible-runner`, which is ignored at the repository
   root. Docker Compose and local defaults resolve the new path while preserving the
   current `/app/playbook` path inside the container.
6. Feature subdirectories are created only when they contain files. The repository
   guidance will no longer require empty `hooks` directories that Git cannot track.

## Risks / Trade-offs

- [Large mechanical import rewrite can leave stale paths] -> Search for all old
  prefixes and run frontend type checking plus Biome afterward.
- [Moving ignored runtime data could lose local execution state] -> Move the
  directory without deleting its contents and verify the old path is absent and the
  new path retains the files.
- [Local scripts may assume the old runtime path] -> Search the full repository for
  path references and update configuration and documentation together.
- [Renames increase the diff despite unchanged behavior] -> Keep code contents
  unchanged except where neutral run ownership requires import changes.

## Migration Plan

1. Move feature directories and rewrite imports mechanically.
2. Extract shared execution files into `features/run` and adjust consumers.
3. Move ignored Ansible runtime data and update configuration/ignore rules.
4. Update repository guidance and validate stale-path searches, types, and lint.

Rollback consists of reversing the directory moves and import rewrites. Runtime data
can be moved back intact because no data format changes are involved.

## Open Questions

None.
