import os
import sys
from pathlib import Path

import ansible_runner
import pytest

from app.services.ansible.disabled_roles import disable_roles
from app.services.git.mirror import GitError

TASK = "- ansible.builtin.debug:\n    msg: {}\n"


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def role(project: Path, name: str, parent: str = "roles") -> Path:
    path = project / parent / name
    write(path / "tasks" / "main.yml", TASK.format(name))
    return path


class TestDisableRoles:
    def test_keeps_task_files_but_empties_them(self, tmp_path: Path) -> None:
        demo = role(tmp_path, "demo")
        write(demo / "tasks" / "nested" / "extra.yml", TASK.format("extra"))

        disable_roles(tmp_path, ["demo"])

        assert (demo / "tasks" / "main.yml").read_text() == "[]\n"
        assert (demo / "tasks" / "nested" / "extra.yml").read_text() == "[]\n"

    def test_clears_dependencies_and_argument_specs(self, tmp_path: Path) -> None:
        demo = role(tmp_path, "demo")
        write(demo / "meta" / "main.yml", "dependencies: [other]\n")
        write(demo / "meta" / "argument_specs.yml", "argument_specs: {}\n")

        disable_roles(tmp_path, ["demo"])

        assert (demo / "meta" / "main.yml").read_text() == "dependencies: []\n"
        assert not (demo / "meta" / "argument_specs.yml").exists()

    def test_keeps_what_other_roles_may_use(self, tmp_path: Path) -> None:
        demo = role(tmp_path, "demo")
        for name in ("defaults", "vars", "handlers"):
            write(demo / name / "main.yml", "kept: true\n")

        disable_roles(tmp_path, ["demo"])

        for name in ("defaults", "vars", "handlers"):
            assert (demo / name / "main.yml").read_text() == "kept: true\n"

    def test_only_touches_the_named_role(self, tmp_path: Path) -> None:
        role(tmp_path, "demo")
        other = role(tmp_path, "other")

        disable_roles(tmp_path, ["demo"])

        assert (other / "tasks" / "main.yml").read_text() == TASK.format("other")

    def test_reaches_every_roles_directory(self, tmp_path: Path) -> None:
        near = role(tmp_path, "demo", "playbooks/roles")
        far = role(tmp_path, "demo")

        disable_roles(tmp_path, ["demo"])

        assert (near / "tasks" / "main.yml").read_text() == "[]\n"
        assert (far / "tasks" / "main.yml").read_text() == "[]\n"

    def test_role_with_only_meta_ends_without_tasks(self, tmp_path: Path) -> None:
        write(tmp_path / "roles" / "demo" / "meta" / "main.yml", "dependencies: [x]\n")

        disable_roles(tmp_path, ["demo"])

        demo = tmp_path / "roles" / "demo"
        assert (demo / "tasks" / "main.yml").read_text() == "[]\n"
        assert (demo / "meta" / "main.yml").read_text() == "dependencies: []\n"

    def test_nothing_to_disable_needs_no_roles(self, tmp_path: Path) -> None:
        disable_roles(tmp_path, [])

    def test_missing_role_is_an_error(self, tmp_path: Path) -> None:
        role(tmp_path, "demo")

        with pytest.raises(GitError) as raised:
            disable_roles(tmp_path, ["gone"])

        assert raised.value.kind == "not_found"
        assert "gone" in str(raised.value)

    @pytest.mark.parametrize("name", ["..", ".", "a/b", "../demo", ""])
    def test_invalid_name_is_an_error(self, tmp_path: Path, name: str) -> None:
        demo = role(tmp_path, "demo")

        with pytest.raises(GitError) as raised:
            disable_roles(tmp_path, [name])

        assert raised.value.kind == "invalid"
        assert (demo / "tasks" / "main.yml").read_text() == TASK.format("demo")


@pytest.mark.skipif(os.name != "posix", reason="POSIX symlinks")
class TestSymlinksNeverWrittenThrough:
    @pytest.fixture
    def outside(self, tmp_path: Path) -> Path:
        path = tmp_path / "outside"
        write(path / "main.yml", "untouched\n")
        return path

    @pytest.fixture
    def project(self, tmp_path: Path) -> Path:
        path = tmp_path / "project"
        path.mkdir()
        return path

    def test_tasks_file(self, project: Path, outside: Path) -> None:
        demo = role(project, "demo")
        (demo / "tasks" / "linked.yml").symlink_to(outside / "main.yml")

        disable_roles(project, ["demo"])

        assert (outside / "main.yml").read_text() == "untouched\n"
        assert not (demo / "tasks" / "linked.yml").is_symlink()

    def test_tasks_directory(self, project: Path, outside: Path) -> None:
        demo = project / "roles" / "demo"
        demo.mkdir(parents=True)
        (demo / "tasks").symlink_to(outside)

        disable_roles(project, ["demo"])

        assert (outside / "main.yml").read_text() == "untouched\n"
        assert (demo / "tasks" / "main.yml").read_text() == "[]\n"

    def test_meta_directory(self, project: Path, outside: Path) -> None:
        demo = role(project, "demo")
        (demo / "meta").symlink_to(outside)

        disable_roles(project, ["demo"])

        assert (outside / "main.yml").read_text() == "untouched\n"

    def test_meta_file(self, project: Path, outside: Path) -> None:
        demo = role(project, "demo")
        (demo / "meta").mkdir()
        (demo / "meta" / "main.yml").symlink_to(outside / "main.yml")

        disable_roles(project, ["demo"])

        assert (outside / "main.yml").read_text() == "untouched\n"
        assert (demo / "meta" / "main.yml").read_text() == "dependencies: []\n"

    def test_role_directory(self, project: Path, outside: Path) -> None:
        (project / "roles").mkdir()
        (project / "roles" / "demo").symlink_to(outside)

        disable_roles(project, ["demo"])

        assert (outside / "main.yml").read_text() == "untouched\n"
        assert (project / "roles" / "demo" / "tasks" / "main.yml").exists()


class TestRealAnsibleRun:
    """El playbook usa los roles de todas las formas y Ansible decide qué corre."""

    def test_only_the_enabled_role_runs(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv(
            "PATH", f"{Path(sys.executable).parent}{os.pathsep}{os.environ['PATH']}"
        )
        project = tmp_path / "project"
        unchecked = role(project, "unchecked")
        role(project, "dep")
        role(project, "active")
        write(unchecked / "tasks" / "extra.yml", TASK.format("unchecked_extra"))
        write(unchecked / "meta" / "main.yml", "dependencies: [dep]\n")
        write(unchecked / "defaults" / "main.yml", "unchecked_default: kept\n")
        write(
            project / "site.yml",
            "- hosts: all\n  connection: local\n  gather_facts: false\n"
            "  roles:\n    - unchecked\n    - role: active\n"
            "  tasks:\n"
            "    - ansible.builtin.debug:\n        msg: loose {{ unchecked_default }}\n"
            "    - ansible.builtin.include_role:\n        name: unchecked\n"
            "        tasks_from: extra\n"
            "    - ansible.builtin.import_role:\n        name: unchecked\n",
        )
        config = tmp_path / "empty.cfg"
        config.write_text("")

        disable_roles(project, ["unchecked"])
        result = ansible_runner.run(
            private_data_dir=str(tmp_path),
            project_dir=str(project),
            playbook="site.yml",
            inventory="localhost,",
            envvars={
                "ANSIBLE_CONFIG": str(config),
                "ANSIBLE_HOME": str(tmp_path / "home"),
                "ANSIBLE_ROLES_PATH": str(project / "roles"),
            },
            quiet=True,
        )

        output = result.stdout.read()
        assert result.rc == 0, output
        assert '"msg": "active"' in output
        assert '"msg": "loose kept"' in output
        for name in ("unchecked", "unchecked_extra", "dep"):
            assert f'"msg": "{name}"' not in output
