import os
import stat
from pathlib import Path

import pytest

from app.core.config import settings
from app.services.ansible.materialize import (
    cleanup,
    materialize,
    materialize_hosts,
    write_script_file,
)
from app.services.ansible.models import (
    GitPlaybookSource,
    ResolvedHost,
    ResolvedPlaybook,
    ResolvedRunBundle,
)
from app.services.git.mirror import GitError

posix_only = pytest.mark.skipif(os.name != "posix", reason="POSIX file modes")

PLAY = "- hosts: all\n  tasks: []\n"


def host(name: str, **overrides) -> ResolvedHost:
    fields = {
        "name": name,
        "address": "10.0.0.1",
        "username": "deploy",
        "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----",
        "connection": "ssh",
    }
    return ResolvedHost(**(fields | overrides))


def runs_dir() -> Path:
    return Path(settings.run_scratch_dir)


def mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


class TestMaterializeHosts:
    @pytest.mark.parametrize("name", ["web-01", "../../etc/x", "a/b", "..", ""])
    def test_key_files_stay_in_the_key_dir(self, name: str) -> None:
        materialized = materialize_hosts([host(name)], "label")
        key_dir = (materialized.run_dir / "keys").resolve()

        key = materialized.key_path_map[name]
        assert key.resolve().parent == key_dir
        assert key.read_text().endswith("-----END OPENSSH PRIVATE KEY-----\n")
        assert materialized.run_dir.resolve().is_relative_to(runs_dir().resolve())

    @posix_only
    def test_key_files_are_owner_only(self) -> None:
        materialized = materialize_hosts([host("a"), host("b")], "label")
        for key in materialized.key_path_map.values():
            assert mode(key) == 0o600

    def test_one_key_per_host(self) -> None:
        materialized = materialize_hosts([host("a"), host("b")], "label")
        assert set(materialized.key_path_map) == {"a", "b"}
        assert len(set(materialized.key_path_map.values())) == 2

    def test_inventory_host_vars(self) -> None:
        materialized = materialize_hosts(
            [host("web", port=2222), host("db", address="10.0.0.2", username="")],
            "label",
        )
        hosts = materialized.inventory.root["all"]["hosts"]

        assert hosts["web"] == {
            "ansible_host": "10.0.0.1",
            "ansible_user": "deploy",
            "ansible_connection": "ssh",
            "ansible_ssh_private_key_file": str(materialized.key_path_map["web"]),
            "ansible_port": 2222,
        }
        # No port: the key is absent. No username: the setting is the fallback.
        assert "ansible_port" not in hosts["db"]
        assert hosts["db"]["ansible_user"] == settings.ansible_user
        assert hosts["db"]["ansible_host"] == "10.0.0.2"

    def test_cleanup_removes_the_run_dir(self) -> None:
        materialized = materialize_hosts([host("a")], "label")
        assert materialized.run_dir.exists()
        cleanup(materialized)
        assert not materialized.run_dir.exists()
        assert list(runs_dir().iterdir()) == []


class TestWriteScriptFile:
    @pytest.mark.parametrize(
        ("language", "extension", "shebang"),
        [
            ("bash", "sh", "#!/usr/bin/env bash"),
            ("python", "py", "#!/usr/bin/env python3"),
        ],
    )
    def test_adds_extension_and_shebang(
        self, tmp_path: Path, language: str, extension: str, shebang: str
    ) -> None:
        path = write_script_file(tmp_path, "my script", "echo hi", language)
        assert path == tmp_path / f"my_script.{extension}"
        assert path.read_text() == f"{shebang}\necho hi\n"

    def test_keeps_an_existing_shebang(self, tmp_path: Path) -> None:
        path = write_script_file(tmp_path, "s", "#!/bin/sh\necho hi\n")
        assert path.read_text() == "#!/bin/sh\necho hi\n"

    def test_stays_in_the_run_dir(self, tmp_path: Path) -> None:
        path = write_script_file(tmp_path, "../../x", "echo hi")
        assert path.parent == tmp_path

    @posix_only
    def test_is_executable(self, tmp_path: Path) -> None:
        assert mode(write_script_file(tmp_path, "s", "echo hi")) == 0o755


class TestMaterialize:
    def test_inline_playbook(self) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(name="deploy app", content=PLAY),
            hosts=[host("web")],
        )
        run = materialize(bundle)

        assert run.project_dir == run.run_dir
        assert run.playbook_path.parent == run.run_dir
        assert run.playbook_path.read_text() == PLAY
        assert run.playbook.startswith("deploy_app-")
        assert run.envvars == {}

        cleanup(run)
        assert list(runs_dir().iterdir()) == []

    def test_git_playbook(self, git_mirror) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="web",
                content="",
                git=GitPlaybookSource(
                    repository_id=git_mirror.repository_id,
                    url="https://example.com/repo.git",
                    commit=git_mirror.commit,
                    path="nested/web.yaml",
                ),
            ),
            hosts=[host("web")],
        )
        run = materialize(bundle)

        assert run.project_dir == (run.run_dir / "project").resolve()
        assert run.playbook == "nested/web.yaml"
        assert (run.project_dir / "site.yml").read_text() == PLAY
        # The repository's own ansible.cfg is ignored in favour of an empty
        # runner-controlled one.
        config = Path(run.envvars["ANSIBLE_CONFIG"])
        assert config.parent == run.run_dir
        assert config.read_text() == ""

        cleanup(run)
        assert list(runs_dir().iterdir()) == []

    @pytest.mark.parametrize("path", ["../escape.yml", "/etc/passwd", "missing.yml"])
    def test_git_playbook_outside_the_tree_is_rejected(
        self, git_mirror, path: str
    ) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="web",
                content="",
                git=GitPlaybookSource(
                    repository_id=git_mirror.repository_id,
                    url="https://example.com/repo.git",
                    commit=git_mirror.commit,
                    path=path,
                ),
            ),
            hosts=[host("web")],
        )
        with pytest.raises(GitError):
            materialize(bundle)
        # The failed run cleaned up after itself (keys included).
        assert list(runs_dir().iterdir()) == []
