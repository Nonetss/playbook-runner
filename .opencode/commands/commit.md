---
description: Commit all uncommitted changes following the project's commit standard
---

Commit all outstanding changes in the repository, following the exact conventions already established in this project's git history.

Steps:

1. Run `git status` and `git diff` (staged and unstaged) to see everything that needs to be committed. Never use destructive flags like `-uall`.
2. Run `git log --pretty=format:"%s" -20` to confirm the current message style before writing anything.
3. Group the changes into logical commits if they touch unrelated concerns; otherwise a single commit is fine. Do not mix unrelated features/fixes into one commit if they can be reasonably split.
4. Stage files explicitly by name (never `git add -A` or `git add .`) and skip anything that looks like a secret or credential file, warning me if you find one.
5. Write each commit message in Conventional Commits style, matching this repo's exact pattern: `type(scope): short imperative summary`, e.g. `feat(frontend): add 404 page`, `fix(api): use proper HTTP methods on destructive oRPC routes`, `refactor(api): reorganize features by domain instead of technical layers`, `chore(deps): update Astro and Astro.js dependencies`.
   - Common types used here: `feat`, `fix`, `refactor`, `chore`, `docs`.
   - Scope is the affected area/package (e.g. `api`, `frontend`, `auth`, `docker`, `openspec`, `deps`, `config`), and multiple comma-separated scopes are used when a change spans areas (e.g. `chore(frontend,docs,openspec): ...`).
   - Summary is lowercase, imperative mood, no trailing period.
   - Focus the message on *why* the change was made, not a restatement of the diff.
   - Do not add a `Co-Authored-By` line or any other footer unless I explicitly ask for it.
6. Never amend existing commits, never force anything, and never skip hooks.
7. After committing, run `git status` to confirm the working tree is clean (or report what's left if something couldn't be committed) and show me the commit(s) created.
