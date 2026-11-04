"""Vault: la contraseña del repositorio llega a Ansible y a nadie más."""

from __future__ import annotations

import asyncio
import textwrap
from pathlib import Path

import pytest
from ansible.constants import DEFAULT_VAULT_ID_MATCH
from ansible.parsing.vault import VaultLib, VaultSecret

from app.core.config import settings
from app.grpc.services import runner as runner_module
from app.grpc.services.runner import RunnerServicer
from app.grpc.stubs import GitSource, Host, Playbook, RunBundleRequest
from app.services.ansible import materialize as materialize_module
from app.services.ansible import runner as ansible_module
from app.services.ansible.materialize import MaterializedRun, cleanup, materialize
from app.services.ansible.models import (
    GitPlaybookSource,
    ResolvedHost,
    ResolvedPlaybook,
    ResolvedRunBundle,
)
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig
from app.services.git import mirror

PASSWORD = "correct-horse-battery"
COMMIT = "0123456789abcdef0123456789abcdef01234567"


def encrypt(plaintext: str, password: str = PASSWORD) -> str:
    secret = VaultSecret(password.encode())
    vault = VaultLib([(DEFAULT_VAULT_ID_MATCH, secret)])
    return vault.encrypt(plaintext, secret=secret).decode()


def use_tree(monkeypatch: pytest.MonkeyPatch, files: dict[str, str]) -> None:
    """``materialize`` recibe este árbol en lugar de exportar un commit."""

    def export(_repository_id: str, _commit: str, dest: Path) -> None:
        for name, content in files.items():
            path = dest / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")

    monkeypatch.setattr(materialize_module, "export_tree", export)


def git_bundle(password: str | None = PASSWORD) -> ResolvedRunBundle:
    return ResolvedRunBundle(
        playbook=ResolvedPlaybook(
            name="site",
            content="",
            git=GitPlaybookSource(
                repository_id="repo",
                url="https://example.com/repo.git",
                commit=COMMIT,
                path="site.yml",
                vault_password=password,
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


def run_output(materialized: MaterializedRun) -> str:
    runner = AnsibleRunner(
        AnsibleRunnerConfig(
            playbook=materialized.playbook,
            private_data_dir=str(materialized.run_dir),
            project_dir=str(materialized.project_dir),
            inventory=materialized.inventory,
            envvars=materialized.envvars,
        )
    )

    async def collect() -> list:
        return [event async for event in runner.stream()]

    return "\n".join(str(event) for event in asyncio.run(collect()))


def vaulted_tree() -> dict[str, str]:
    inline = textwrap.indent(encrypt("valor-en-linea"), "      ")
    return {
        "site.yml": (
            "- hosts: otros\n"
            "  gather_facts: false\n"
            "  vars_files: [secretos.yml]\n"
            "  vars:\n"
            "    en_linea: !vault |\n"
            f"{inline}\n"
            "  tasks:\n"
            "    - ansible.builtin.debug:\n"
            "        msg: 'L={{ en_linea }} F={{ de_fichero }}'\n"
        ),
        "secretos.yml": encrypt("de_fichero: valor-de-fichero\n"),
    }


class TestRealAnsible:
    def test_decrypts_inline_values_and_variable_files(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(monkeypatch, vaulted_tree())
        materialized = materialize(git_bundle())
        try:
            output = run_output(materialized)
        finally:
            cleanup(materialized)

        assert "L=valor-en-linea F=valor-de-fichero" in output

    @pytest.mark.parametrize("password", ["otra-contraseña", None])
    def test_a_wrong_or_missing_password_fails_with_ansibles_error(
        self, monkeypatch: pytest.MonkeyPatch, password: str | None
    ) -> None:
        use_tree(monkeypatch, vaulted_tree())
        materialized = materialize(git_bundle(password))
        try:
            output = run_output(materialized)
        finally:
            cleanup(materialized)

        assert "valor-en-linea" not in output
        assert "valor-de-fichero" not in output
        assert "ecrypt" in output


class FakeContext:
    def peer(self) -> str:
        return "ipv4:127.0.0.1:1"

    async def abort(self, code, details):
        raise AssertionError(f"unexpected abort: {code} {details}")


class Stop(Exception):
    pass


def git_request(password: str | None = PASSWORD) -> RunBundleRequest:
    return RunBundleRequest(
        playbook=Playbook(
            name="site",
            git=GitSource(
                repository_id="repo",
                url="https://example.com/repo.git",
                commit=COMMIT,
                path="site.yml",
                vault_password=password,
            ),
        ),
        hosts=[
            Host(
                name="uno",
                address="127.0.0.1",
                username="u",
                private_key="KEY",
                connection="local",
            )
        ],
    )


def frames_of(request: RunBundleRequest) -> list:
    async def collect() -> list:
        return [f async for f in RunnerServicer().RunBundle(request, FakeContext())]

    return asyncio.run(collect())


@pytest.fixture
def known_commit(monkeypatch: pytest.MonkeyPatch) -> None:
    async def ensure_commit(*_) -> None:
        return None

    monkeypatch.setattr(mirror, "ensure_commit", ensure_commit)


@pytest.mark.usefixtures("known_commit")
class TestRunBundle:
    def test_the_password_is_masked_and_only_its_path_is_in_the_environment(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(monkeypatch, {"site.yml": "- hosts: all\n  tasks: []\n"})
        seen: list[AnsibleRunnerConfig] = []

        def capture(config: AnsibleRunnerConfig):
            seen.append(config)
            raise Stop

        monkeypatch.setattr(runner_module, "AnsibleRunner", capture)

        with pytest.raises(Stop):
            frames_of(git_request())

        config = seen[0]
        assert PASSWORD in config.redact
        env = config.run_kwargs()["envvars"]
        assert PASSWORD not in str(env)
        assert env["ANSIBLE_VAULT_PASSWORD_FILE"].endswith("/vault-password")
        assert not list(Path(settings.run_scratch_dir).iterdir())

    def test_the_password_is_masked_in_real_output(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(
            monkeypatch,
            {
                "site.yml": (
                    "- hosts: all\n"
                    "  gather_facts: false\n"
                    "  tasks:\n"
                    "    - ansible.builtin.debug:\n"
                    f"        msg: 'dice {PASSWORD} y sigue'\n"
                )
            },
        )

        frames = frames_of(git_request())

        output = "\n".join(str(frame) for frame in frames)
        assert "dice " in output
        assert PASSWORD not in output
        assert not list(Path(settings.run_scratch_dir).iterdir())

    @pytest.mark.parametrize("password", ["otra-contraseña", None])
    def test_the_user_is_told_why_a_vaulted_file_failed_to_load(
        self, monkeypatch: pytest.MonkeyPatch, password: str | None
    ) -> None:
        use_tree(monkeypatch, vaulted_tree())

        frames = frames_of(git_request(password))

        assert "secretos.yml" in frames[-1].error
        assert "\x1b[" not in frames[-1].error
        assert not [frame for frame in frames if frame.HasField("done")]
        assert "valor-de-fichero" not in str(frames)

    def test_the_user_is_told_why_a_vaulted_value_failed(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        tree = vaulted_tree()
        del tree["secretos.yml"]
        tree["site.yml"] = tree["site.yml"].replace(
            "  vars_files: [secretos.yml]\n", ""
        )
        use_tree(monkeypatch, tree)

        frames = frames_of(git_request("otra-contraseña"))

        assert "ecrypt" in str(frames)
        assert "valor-en-linea" not in str(frames)

    def test_any_playbook_that_cannot_load_says_why(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(
            monkeypatch,
            {"site.yml": "- hosts: all\n  tasks:\n    - no_existe_este_modulo: {}\n"},
        )

        frames = frames_of(git_request(None))

        assert "no_existe_este_modulo" in frames[-1].error

    def test_a_failed_task_still_ends_in_done(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(
            monkeypatch,
            {
                "site.yml": (
                    "- hosts: all\n"
                    "  gather_facts: false\n"
                    "  tasks:\n"
                    "    - ansible.builtin.fail:\n"
                    "        msg: fallo de la tarea\n"
                )
            },
        )

        frames = frames_of(git_request(None))

        assert frames[-1].HasField("done")
        assert not frames[-1].done.ok
        assert "fallo de la tarea" in str(frames)

    def test_an_encrypted_import_ends_the_run_before_ansible(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_tree(
            monkeypatch,
            {
                "site.yml": "- import_playbook: nested/cifrado.yml\n",
                "nested/cifrado.yml": encrypt("- hosts: otros\n  tasks: []\n"),
            },
        )

        def unreachable(*_):
            raise AssertionError("Ansible started on an encrypted playbook")

        monkeypatch.setattr(runner_module, "AnsibleRunner", unreachable)
        monkeypatch.setattr(ansible_module, "ansible_runner", None)

        frames = frames_of(git_request())

        assert len(frames) == 1
        assert "nested/cifrado.yml" in frames[0].error
        assert not list(Path(settings.run_scratch_dir).iterdir())
