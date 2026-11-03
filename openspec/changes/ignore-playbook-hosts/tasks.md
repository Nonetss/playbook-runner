## 1. Runner

- [x] 1.1 Add `play_targets.py`, rewriting each play's `hosts` at text level and following static imports inside the project, and call it from `materialize`; verify with `tests/test_play_targets.py`, including a real Ansible run.

## 2. Interface and documentation

- [x] 2.1 Remove the `hosts: all` warning and its strings from the playbook edit page; verify with `bun run check-types` and an E2E run of a play with another pattern.
- [x] 2.2 Explain the behaviour and `delegate_to: localhost` in `first-run` in both languages and in `AGENTS.md`; verify with `bun run --filter site build`.
