import os
import stat
import sys
from pathlib import Path

import ansible_runner
import pytest

from app.core.config import settings
from app.services.ansible.materialize import (
    cleanup,
    materialize,
    materialize_hosts,
    role_search_path,
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

    def test_git_playbook_finds_the_roots_roles(self, git_mirror) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="nested:web.yaml",
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

        # A ``:`` in the playbook's name must not split the path list.
        assert ":" not in run.run_dir.name
        assert run.envvars["ANSIBLE_ROLES_PATH"] == str(run.project_dir / "roles")

        cleanup(run)

    @posix_only
    def test_vault_password_is_a_private_file_removed_with_the_run(
        self, git_mirror
    ) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="web",
                content="",
                git=GitPlaybookSource(
                    repository_id=git_mirror.repository_id,
                    url="https://example.com/repo.git",
                    commit=git_mirror.commit,
                    path="site.yml",
                    vault_password="s3cret",
                ),
            ),
            hosts=[host("web")],
        )
        run = materialize(bundle)

        path = Path(run.envvars["ANSIBLE_VAULT_PASSWORD_FILE"])
        assert path.parent == run.run_dir
        assert path.read_text() == "s3cret"
        # Ansible would run an executable password file as a script.
        assert mode(path) == 0o600

        cleanup(run)
        assert not path.exists()

    def test_no_vault_password_writes_nothing(self, git_mirror) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="web",
                content="",
                git=GitPlaybookSource(
                    repository_id=git_mirror.repository_id,
                    url="https://example.com/repo.git",
                    commit=git_mirror.commit,
                    path="site.yml",
                ),
            ),
            hosts=[host("web")],
        )
        run = materialize(bundle)

        assert "ANSIBLE_VAULT_PASSWORD_FILE" not in run.envvars
        assert not (run.run_dir / "vault-password").exists()

        cleanup(run)

    def test_git_playbook_disables_roles_in_its_copy(self, git_mirror) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="web",
                content="",
                git=GitPlaybookSource(
                    repository_id=git_mirror.repository_id,
                    url="https://example.com/repo.git",
                    commit=git_mirror.commit,
                    path="site.yml",
                ),
            ),
            hosts=[host("web")],
            disabled_roles=["x"],
        )
        run = materialize(bundle)

        assert (run.project_dir / "roles/x/tasks/main.yml").read_text() == "[]\n"

        cleanup(run)

    def test_unknown_disabled_role_leaves_nothing_behind(self, git_mirror) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(
                name="web",
                content="",
                git=GitPlaybookSource(
                    repository_id=git_mirror.repository_id,
                    url="https://example.com/repo.git",
                    commit=git_mirror.commit,
                    path="site.yml",
                ),
            ),
            hosts=[host("web")],
            disabled_roles=["gone"],
        )

        with pytest.raises(GitError):
            materialize(bundle)

        assert list(runs_dir().iterdir()) == []

    def test_inline_playbook_has_no_role_path(self) -> None:
        bundle = ResolvedRunBundle(
            playbook=ResolvedPlaybook(name="a:b", content=PLAY),
            hosts=[host("web")],
        )
        run = materialize(bundle)

        assert ":" not in run.run_dir.name
        assert "ANSIBLE_ROLES_PATH" not in run.envvars

        cleanup(run)

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


class TestRoleSearchPath:
    @staticmethod
    def playbook(project: Path, path: str = "playbooks/site.yml") -> Path:
        playbook = project / path
        playbook.parent.mkdir(parents=True, exist_ok=True)
        playbook.write_text(PLAY)
        return playbook

    def test_root_roles(self, tmp_path: Path) -> None:
        (tmp_path / "roles").mkdir()
        assert role_search_path(self.playbook(tmp_path), tmp_path) == str(
            tmp_path / "roles"
        )

    def test_two_levels_nearest_first(self, tmp_path: Path) -> None:
        playbook = self.playbook(tmp_path)
        (tmp_path / "roles").mkdir()
        (tmp_path / "playbooks" / "roles").mkdir()
        assert role_search_path(playbook, tmp_path) == os.pathsep.join(
            [str(tmp_path / "playbooks" / "roles"), str(tmp_path / "roles")]
        )

    def test_none_when_there_are_no_roles(self, tmp_path: Path) -> None:
        assert role_search_path(self.playbook(tmp_path), tmp_path) is None

    def test_does_not_look_above_the_project(self, tmp_path: Path) -> None:
        (tmp_path / "roles").mkdir()
        project = tmp_path / "project"
        assert role_search_path(self.playbook(project), project) is None

    def test_skips_a_symlink_out_of_the_tree(self, tmp_path: Path) -> None:
        outside = tmp_path / "outside"
        outside.mkdir()
        project = tmp_path / "project"
        playbook = self.playbook(project)
        (project / "roles").symlink_to(outside)
        assert role_search_path(playbook, project) is None

    def test_skips_a_directory_with_the_separator(self, tmp_path: Path) -> None:
        playbook = self.playbook(tmp_path, "a:b/site.yml")
        (tmp_path / "a:b" / "roles").mkdir()
        (tmp_path / "roles").mkdir()
        assert role_search_path(playbook, tmp_path) == str(tmp_path / "roles")


class TestRoleResolution:
    """Through ``ansible_runner``, as a run does, on a local connection."""

    @staticmethod
    def run(project: Path, monkeypatch: pytest.MonkeyPatch) -> ansible_runner.Runner:
        monkeypatch.setenv(
            "PATH", f"{Path(sys.executable).parent}{os.pathsep}{os.environ['PATH']}"
        )
        data_dir = project.parent
        config = data_dir / "empty.cfg"
        config.write_text("")
        playbook = project / "playbooks" / "site.yml"
        playbook.parent.mkdir(parents=True, exist_ok=True)
        playbook.write_text(
            "- hosts: all\n  connection: local\n  gather_facts: false\n"
            "  roles:\n    - demo\n"
        )
        # The repository's own setting must lose to the runner's empty config.
        (project / "ansible.cfg").write_text("[defaults]\nroles_path = ./elsewhere\n")
        envvars = {
            "ANSIBLE_CONFIG": str(config),
            "ANSIBLE_HOME": str(data_dir / "home"),
        }
        roles_path = role_search_path(playbook, project)
        if roles_path:
            envvars["ANSIBLE_ROLES_PATH"] = roles_path
        return ansible_runner.run(
            private_data_dir=str(data_dir),
            project_dir=str(project),
            playbook="playbooks/site.yml",
            inventory="localhost,",
            envvars=envvars,
            quiet=True,
        )

    @staticmethod
    def write_role(roles: Path, message: str) -> None:
        tasks = roles / "demo" / "tasks"
        tasks.mkdir(parents=True)
        (tasks / "main.yml").write_text(
            f"- ansible.builtin.debug:\n    msg: {message}\n"
        )

    def test_role_at_the_root(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        project = tmp_path / "project"
        self.write_role(project / "roles", "from-root")

        result = self.run(project, monkeypatch)

        assert result.rc == 0
        assert "from-root" in result.stdout.read()

    def test_nearest_role_wins(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        project = tmp_path / "project"
        self.write_role(project / "roles", "from-root")
        self.write_role(project / "playbooks" / "roles", "from-playbooks")

        result = self.run(project, monkeypatch)

        output = result.stdout.read()
        assert result.rc == 0
        assert "from-playbooks" in output
        assert "from-root" not in output

    def test_role_nowhere_fails(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        project = tmp_path / "project"
        self.write_role(project / "elsewhere", "from-repo-config")

        result = self.run(project, monkeypatch)

        output = result.stdout.read()
        assert result.rc != 0
        assert "demo" in output
        assert "from-repo-config" not in output
