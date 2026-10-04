from pathlib import Path

import pytest

from app.services.git.mirror import GitError, export_tree, list_tree, read_blob


def test_list_tree_returns_regular_blobs_with_sizes(git_mirror) -> None:
    entries = {
        path: size
        for path, _, size in list_tree(git_mirror.repository_id, git_mirror.commit, "")
    }
    # The symlink is not a regular file.
    assert "link.yml" not in entries
    assert entries == {
        path: len(content.encode()) for path, content in git_mirror.files.items()
    }


def test_list_tree_honours_subdir(git_mirror) -> None:
    paths = [
        p
        for p, _, _ in list_tree(git_mirror.repository_id, git_mirror.commit, "nested/")
    ]
    assert paths == ["nested/web.yaml"]


def test_list_tree_rejects_escaping_subdir(git_mirror) -> None:
    with pytest.raises(GitError):
        list_tree(git_mirror.repository_id, git_mirror.commit, "../x")


def test_read_blob_returns_content(git_mirror) -> None:
    blobs = {
        p: b for p, b, _ in list_tree(git_mirror.repository_id, git_mirror.commit, "")
    }
    content = read_blob(git_mirror.repository_id, blobs["site.yml"])
    assert content.decode() == git_mirror.files["site.yml"]


def test_export_tree_extracts_the_commit(git_mirror, tmp_path: Path) -> None:
    dest = tmp_path / "export" / "project"
    export_tree(git_mirror.repository_id, git_mirror.commit, dest)

    for path, content in git_mirror.files.items():
        assert (dest / path).read_text() == content
    assert not (dest / ".git").exists()
    # The temporary archive is removed.
    assert list(dest.parent.iterdir()) == [dest]


def test_export_tree_rejects_invalid_commits(git_mirror, tmp_path: Path) -> None:
    with pytest.raises(GitError):
        export_tree(git_mirror.repository_id, "HEAD", tmp_path / "x")


def test_export_tree_fails_for_unknown_commits(git_mirror, tmp_path: Path) -> None:
    with pytest.raises(GitError):
        export_tree(git_mirror.repository_id, "f" * 40, tmp_path / "x")
