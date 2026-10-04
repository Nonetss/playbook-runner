"""Shared fixtures: isolated settings and a real local Git mirror.

Unit tests never touch the developer's ``.env`` paths, the network or a
running service: every directory the code under test writes to points into
``tmp_path``.
"""

from __future__ import annotations

import os
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

import pytest

from app.core.config import settings
from app.services.git.mirror import mirror_path

# Larger than the monkeypatched ``MAX_PLAYBOOK_BYTES`` used by the discover
# tests, while every other file in the repository stays far below it.
BIG_PLAYBOOK_BYTES = 4096


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Point every path setting into ``tmp_path`` and pin the defaults."""
    monkeypatch.setattr(settings, "run_scratch_dir", str(tmp_path / "runs"))
    monkeypatch.setattr(settings, "state_dir", str(tmp_path / "state"))
    monkeypatch.setattr(settings, "ssh_host_key_policy", "accept-new")
    monkeypatch.setattr(settings, "ansible_user", "ansible")


def _git_env() -> dict[str, str]:
    """Environment for test-side git commands, free of the user's config."""
    return {
        **os.environ,
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_AUTHOR_NAME": "Test",
        "GIT_AUTHOR_EMAIL": "test@example.com",
        "GIT_COMMITTER_NAME": "Test",
        "GIT_COMMITTER_EMAIL": "test@example.com",
    }


def git(*args: str, cwd: Path | None = None) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        env=_git_env(),
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


PLAY = "- hosts: all\n  tasks: []\n"

REPO_FILES: dict[str, str] = {
    "site.yml": PLAY,
    "nested/web.yaml": "- import_playbook: ../site.yml\n",
    "roles/x/tasks/main.yml": PLAY,
    ".github/ci.yml": PLAY,
    "vars.yml": "foo: bar\n",
    "big.yml": PLAY + "#" * BIG_PLAYBOOK_BYTES + "\n",
    "README.md": "# test repo\n",
}


@dataclass
class GitMirror:
    repository_id: str
    commit: str
    files: dict[str, str]


@pytest.fixture
def git_mirror(tmp_path: Path) -> GitMirror:
    """A bare mirror of a small repository, where the code expects it.

    Contents: two playbooks (``site.yml``, ``nested/web.yaml``), a role file
    and a hidden-dir file that look like plays, a plain vars file, an
    oversized playbook (``big.yml``), a README and a symlink
    (``link.yml`` → ``site.yml``).
    """
    work = tmp_path / "work"
    for path, content in REPO_FILES.items():
        target = work / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    (work / "link.yml").symlink_to("site.yml")

    git("init", "--quiet", "--initial-branch=main", cwd=work)
    git("add", "--all", cwd=work)
    git("commit", "--quiet", "--message", "init", cwd=work)
    commit = git("rev-parse", "HEAD", cwd=work)

    repository_id = str(uuid.uuid4())
    mirror = mirror_path(repository_id)
    mirror.parent.mkdir(parents=True, exist_ok=True)
    git("clone", "--quiet", "--mirror", str(work), str(mirror))

    return GitMirror(repository_id=repository_id, commit=commit, files=REPO_FILES)
