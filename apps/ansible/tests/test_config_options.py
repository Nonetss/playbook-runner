"""Las opciones del ``ansible.cfg`` del repositorio que el run sí acepta."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
from loguru import logger

from app.services.ansible import materialize as materialize_module
from app.services.ansible.config_options import (
    Discard,
    load_config_options,
    render_config,
)
from app.services.ansible.materialize import cleanup, materialize
from app.services.ansible.models import (
    GitPlaybookSource,
    ResolvedHost,
    ResolvedPlaybook,
    ResolvedRunBundle,
)

COMMIT = "0123456789abcdef0123456789abcdef01234567"
PLAYBOOK = "playbooks/site.yml"
PLAY = "- hosts: all\n  gather_facts: false\n  tasks: []\n"


def write_tree(root: Path, files: dict[str, str]) -> None:
    for name, content in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def load(tmp_path: Path, config: str | None, where: str = "ansible.cfg"):
    files = {PLAYBOOK: PLAY}
    if config is not None:
        files[where] = config
    write_tree(tmp_path, files)
    return load_config_options(tmp_path / PLAYBOOK, tmp_path)


def applied(tmp_path: Path, config: str) -> dict[str, dict[str, str]]:
    options = load(tmp_path, config)
    assert options is not None
    return options.applied


class TestAllowlist:
    @pytest.mark.parametrize(
        ("section", "key", "raw", "expected"),
        [
            ("defaults", "timeout", "60", "60"),
            ("defaults", "timeout", " 7 ", "7"),
            ("defaults", "task_timeout", "300", "300"),
            ("defaults", "gather_timeout", "0", "0"),
            ("defaults", "gathering", "Smart", "smart"),
            ("defaults", "gathering", "explicit", "explicit"),
            ("ssh_connection", "retries", "5", "5"),
            ("ssh_connection", "pipelining", "yes", "True"),
            ("ssh_connection", "pipelining", "False", "False"),
            ("persistent_connection", "connect_timeout", "45", "45"),
            ("persistent_connection", "command_timeout", "120", "120"),
            ("persistent_connection", "connect_retry_timeout", "30", "30"),
        ],
    )
    def test_each_option_accepts_a_valid_value(
        self, tmp_path: Path, section: str, key: str, raw: str, expected: str
    ) -> None:
        assert applied(tmp_path, f"[{section}]\n{key} = {raw}\n") == {
            section: {key: expected}
        }

    @pytest.mark.parametrize(
        ("section", "key", "raw"),
        [
            ("defaults", "timeout", "soon"),
            ("defaults", "timeout", "-1"),
            ("defaults", "timeout", "1.5"),
            ("defaults", "timeout", "٣"),
            ("defaults", "timeout", ""),
            ("defaults", "gathering", "always"),
            ("ssh_connection", "retries", "many"),
            ("ssh_connection", "pipelining", "maybe"),
            ("persistent_connection", "command_timeout", "1h"),
        ],
    )
    def test_each_option_rejects_an_invalid_value(
        self, tmp_path: Path, section: str, key: str, raw: str
    ) -> None:
        options = load(tmp_path, f"[{section}]\n{key} = {raw}\n")

        assert options is not None
        assert options.applied == {}
        assert options.discarded == [Discard(section, key, "invalid", raw.strip())]

    def test_a_percent_sign_does_not_break_the_file(self, tmp_path: Path) -> None:
        config = "[defaults]\ntimeout = 20\nremote_user = a%b\n"

        assert applied(tmp_path, config) == {"defaults": {"timeout": "20"}}

    def test_a_default_section_is_not_inherited(self, tmp_path: Path) -> None:
        config = "[DEFAULT]\ntimeout = 99\n[defaults]\nremote_user = u\n"

        assert applied(tmp_path, config) == {}


class TestDiscards:
    def test_names_why_each_other_key_is_dropped(self, tmp_path: Path) -> None:
        config = (
            "[defaults]\n"
            "timeout = 60\n"
            "roles_path = ./x\n"
            "library = ./lib\n"
            "callback_plugins = ./cb\n"
            "forks = 50\n"
            "host_key_checking = False\n"
            "[ssh_connection]\n"
            "retries = many\n"
            "ssh_args = -o ProxyCommand=evil\n"
            "[inventory]\n"
            "enable_plugins = script\n"
        )

        options = load(tmp_path, config)

        assert options is not None
        assert options.applied == {"defaults": {"timeout": "60"}}
        assert {(d.section, d.key): d.reason for d in options.discarded} == {
            ("defaults", "roles_path"): "not_allowed",
            ("defaults", "library"): "not_allowed",
            ("defaults", "callback_plugins"): "not_allowed",
            ("defaults", "forks"): "runner_controlled",
            ("defaults", "host_key_checking"): "runner_controlled",
            ("ssh_connection", "retries"): "invalid",
            ("ssh_connection", "ssh_args"): "runner_controlled",
            ("inventory", "enable_plugins"): "not_allowed",
        }

    def test_the_value_of_a_key_outside_the_list_is_not_kept(
        self, tmp_path: Path
    ) -> None:
        options = load(tmp_path, "[defaults]\nlibrary = /secreto/ruta\n")

        assert options is not None
        assert all(d.value is None for d in options.discarded)


class TestLookup:
    def test_no_file_is_none(self, tmp_path: Path) -> None:
        assert load(tmp_path, None) is None

    def test_an_unparsable_file_is_none(self, tmp_path: Path) -> None:
        assert load(tmp_path, "esto no es un ini\n") is None

    def test_an_undecodable_file_is_none(self, tmp_path: Path) -> None:
        write_tree(tmp_path, {PLAYBOOK: PLAY})
        (tmp_path / "ansible.cfg").write_bytes(b"\xff\xfe[defaults]\n")

        assert load_config_options(tmp_path / PLAYBOOK, tmp_path) is None

    def test_the_nearest_file_wins_and_files_are_not_merged(
        self, tmp_path: Path
    ) -> None:
        write_tree(
            tmp_path,
            {
                PLAYBOOK: PLAY,
                "ansible.cfg": "[defaults]\ntimeout = 90\ntask_timeout = 10\n",
                "playbooks/ansible.cfg": "[defaults]\ntimeout = 30\n",
            },
        )

        options = load_config_options(tmp_path / PLAYBOOK, tmp_path)

        assert options is not None
        assert options.applied == {"defaults": {"timeout": "30"}}

    def test_a_symlinked_file_is_never_read(self, tmp_path: Path) -> None:
        outside = tmp_path / "fuera.cfg"
        outside.write_text("[defaults]\ntimeout = 5\n", encoding="utf-8")
        project = tmp_path / "project"
        write_tree(project, {PLAYBOOK: PLAY})
        (project / "ansible.cfg").symlink_to(outside)

        assert load_config_options(project / PLAYBOOK, project) is None

    def test_a_file_above_the_tree_does_not_count(self, tmp_path: Path) -> None:
        write_tree(
            tmp_path,
            {"ansible.cfg": "[defaults]\ntimeout = 5\n", f"tree/{PLAYBOOK}": PLAY},
        )

        tree = tmp_path / "tree"
        assert load_config_options(tree / PLAYBOOK, tree) is None


class TestRender:
    def test_writes_only_the_applied_options(self) -> None:
        text = render_config(
            {"defaults": {"timeout": "60"}, "ssh_connection": {"retries": "3"}}
        )

        assert text == "[defaults]\ntimeout = 60\n\n[ssh_connection]\nretries = 3\n"

    def test_nothing_applied_is_an_empty_file(self) -> None:
        assert render_config({}) == ""


def git_bundle() -> ResolvedRunBundle:
    return ResolvedRunBundle(
        playbook=ResolvedPlaybook(
            name="site",
            content="",
            git=GitPlaybookSource(
                repository_id="repo",
                url="https://example.com/repo.git",
                commit=COMMIT,
                path=PLAYBOOK,
            ),
        ),
        hosts=[
            ResolvedHost(
                name="uno",
                address="127.0.0.1",
                username="u",
                privateKey="KEY",
                connection="local",
            )
        ],
    )


def use_tree(monkeypatch: pytest.MonkeyPatch, files: dict[str, str]) -> None:
    def export(_repository_id: str, _commit: str, dest: Path) -> None:
        write_tree(dest, files)

    monkeypatch.setattr(materialize_module, "export_tree", export)


MIXED = (
    "[defaults]\n"
    "timeout = 60\n"
    "roles_path = ./x\n"
    "library = ./lib\n"
    "callback_plugins = ./cb\n"
    "forks = 50\n"
    "[ssh_connection]\n"
    "retries = many\n"
)


class TestMaterialize:
    def test_the_runner_config_holds_only_allowlisted_keys(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(monkeypatch, {PLAYBOOK: PLAY, "ansible.cfg": MIXED})

        run = materialize(git_bundle())
        try:
            config = Path(run.envvars["ANSIBLE_CONFIG"])
            assert config.parent == run.run_dir
            assert config.read_text() == "[defaults]\ntimeout = 60\n"
        finally:
            cleanup(run)

    def test_without_a_repository_config_the_file_stays_empty(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(monkeypatch, {PLAYBOOK: PLAY})

        run = materialize(git_bundle())
        try:
            assert Path(run.envvars["ANSIBLE_CONFIG"]).read_text() == ""
        finally:
            cleanup(run)

    def test_a_broken_config_does_not_stop_the_run(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(monkeypatch, {PLAYBOOK: PLAY, "ansible.cfg": "no es un ini\n"})

        run = materialize(git_bundle())
        try:
            assert Path(run.envvars["ANSIBLE_CONFIG"]).read_text() == ""
        finally:
            cleanup(run)

    def test_logs_what_was_applied_and_what_was_not(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(monkeypatch, {PLAYBOOK: PLAY, "ansible.cfg": MIXED})
        messages: list[str] = []
        sink = logger.add(
            lambda message: messages.append(str(message)), format="{message}"
        )

        try:
            cleanup(materialize(git_bundle()))
        finally:
            logger.remove(sink)

        text = "\n".join(messages)
        assert "defaults.timeout" in text
        assert "defaults.roles_path (not_allowed)" in text
        assert "defaults.forks (runner_controlled)" in text
        assert "ssh_connection.retries (invalid: many)" in text
        assert "./lib" not in text
        assert "./cb" not in text


def config_dump(config: Path, env: dict[str, str]) -> str:
    binary = Path(sys.executable).parent / "ansible-config"
    result = subprocess.run(
        [str(binary), "dump", "--only-changed"],
        env={"ANSIBLE_CONFIG": str(config), "PATH": "/usr/bin:/bin", **env},
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


class TestRealAnsible:
    def test_ansible_reads_the_generated_file(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        use_tree(monkeypatch, {PLAYBOOK: PLAY, "ansible.cfg": MIXED})
        run = materialize(git_bundle())
        try:
            dump = config_dump(
                Path(run.envvars["ANSIBLE_CONFIG"]), {"ANSIBLE_HOME": str(tmp_path)}
            )
        finally:
            cleanup(run)

        assert "DEFAULT_TIMEOUT(" in dump
        assert dump.count("= 60") == 1
        assert "DEFAULT_FORKS" not in dump
        assert "DEFAULT_ROLES_PATH" not in dump
        assert "DEFAULT_MODULE_PATH" not in dump

    def test_the_environment_outranks_the_repository(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        use_tree(monkeypatch, {PLAYBOOK: PLAY, "ansible.cfg": MIXED})
        run = materialize(git_bundle())
        try:
            dump = config_dump(
                Path(run.envvars["ANSIBLE_CONFIG"]),
                {"ANSIBLE_HOME": str(tmp_path), "ANSIBLE_TIMEOUT": "5"},
            )
        finally:
            cleanup(run)

        assert "DEFAULT_TIMEOUT(env: ANSIBLE_TIMEOUT) = 5" in dump
        assert "= 60" not in dump
