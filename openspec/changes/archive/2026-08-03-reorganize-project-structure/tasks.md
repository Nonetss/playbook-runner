## 1. Frontend Feature Layout

- [x] 1.1 Move frontend domain modules from `src/components/features` to
  `src/features` and update all imports
- [x] 1.2 Rename `global` to `app-shell` and `try` to `diagnostics`
- [x] 1.3 Create the neutral `run` feature and move shared execution hooks, types,
  inventory selection, and console UI into it
- [x] 1.4 Verify no stale feature paths or cross-feature imports through playbooks
  remain

## 2. Runtime Data Layout

- [x] 2.1 Move existing ignored Ansible runtime data to
  `.data/ansible-runner` without deleting local state
- [x] 2.2 Update ignore rules, Docker Compose, local configuration, and path
  documentation for the new runtime directory

## 3. Repository Guidance and Validation

- [x] 3.1 Update `AGENTS.md` feature-layout and runtime-data guidance
- [x] 3.2 Run frontend type checking, repository type checking, Biome, and relevant
  stale-path searches
