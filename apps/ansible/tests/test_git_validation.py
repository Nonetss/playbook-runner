import uuid
from pathlib import PurePosixPath

import pytest

from app.services.git.mirror import (
    GitError,
    _classify,
    mirror_path,
    repos_dir,
    safe_repo_path,
    validate_commit,
    validate_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/org/repo.git",
        "ssh://git@github.com:22/org/repo.git",
        "git@github.com:org/repo.git",
    ],
)
def test_validate_url_accepts_https_and_ssh(url: str) -> None:
    validate_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "file:///tmp/repo",
        "ext::sh -c touch% /tmp/pwned",
        "http://github.com/org/repo.git",
        "/tmp/repo",
        "../repo",
        "https://github.com/org/re po.git",
        "git@github.com:org/repo.git\n--upload-pack=x",
        "",
    ],
)
def test_validate_url_rejects_other_transports(url: str) -> None:
    with pytest.raises(GitError) as exc:
        validate_url(url)
    assert exc.value.kind == "invalid"


@pytest.mark.parametrize("commit", ["a" * 40, "0123456789abcdef" * 4])
def test_validate_commit_accepts_sha1_and_sha256(commit: str) -> None:
    validate_commit(commit)


@pytest.mark.parametrize(
    "commit",
    ["a" * 39, "a" * 41, "A" * 40, "g" * 40, "HEAD", "main", "--all", ""],
)
def test_validate_commit_rejects_non_shas(commit: str) -> None:
    with pytest.raises(GitError):
        validate_commit(commit)


def test_mirror_path_is_inside_repos_dir() -> None:
    repository_id = str(uuid.uuid4())
    path = mirror_path(repository_id)
    assert path == repos_dir() / f"{repository_id}.git"


@pytest.mark.parametrize("repository_id", ["../x", "x", "", "/etc"])
def test_mirror_path_rejects_non_uuids(repository_id: str) -> None:
    with pytest.raises(GitError):
        mirror_path(repository_id)


@pytest.mark.parametrize("path", ["", "/abs/site.yml", "a/../../b", "../site.yml"])
def test_safe_repo_path_rejects_escapes(path: str) -> None:
    with pytest.raises(GitError):
        safe_repo_path(path)


def test_safe_repo_path_accepts_relative_paths() -> None:
    assert safe_repo_path("dir/site.yml") == PurePosixPath("dir/site.yml")


@pytest.mark.parametrize(
    ("stderr", "kind"),
    [
        ("fatal: couldn't find remote ref refs/heads/nope", "not_found"),
        ("fatal: Not a valid object name abc", "not_found"),
        ("git@github.com: Permission denied (publickey).", "invalid"),
        ("fatal: Authentication failed for 'https://x'", "invalid"),
        ("Host key verification failed.", "invalid"),
        ("ERROR: Repository not found.", "invalid"),
        ("fatal: could not read Username for 'https://x'", "invalid"),
        ("fatal: unable to access: Could not resolve host", "unavailable"),
    ],
)
def test_classify(stderr: str, kind: str) -> None:
    assert _classify(stderr) == kind
