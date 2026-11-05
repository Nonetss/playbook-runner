"""Las variables del inventario que declara ``ansible.cfg`` llegan a la ejecución."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from ansible.constants import DEFAULT_VAULT_ID_MATCH
from ansible.parsing.vault import VaultLib, VaultSecret

from app.services.ansible import materialize as materialize_module
from app.services.ansible.inventory_vars import (
    copy_inventory_vars,
    repository_inventories,
)
from app.services.ansible.materialize import MaterializedRun, cleanup, materialize
from app.services.ansible.models import (
    GitPlaybookSource,
    ResolvedHost,
    ResolvedPlaybook,
    ResolvedRunBundle,
)
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig

PASSWORD = "correct-horse-battery"
COMMIT = "0123456789abcdef0123456789abcdef01234567"
PLAYBOOK = "server-setup/playbooks/site.yml"
PLAY = (
    "- hosts: proxmox_vms\n"
    "  gather_facts: false\n"
    "  tasks:\n"
    "    - ansible.builtin.debug:\n"
    "        msg: 'valor={{ del_inventario | default(\"AUSENTE\") }}'\n"
)
CONFIG = "[defaults]\ninventory = inventory\nvault_password_file = .vault_pass\n"
VARS = "del_inventario: del-repositorio\n"


def write_tree(root: Path, files: dict[str, str]) -> None:
    for name, content in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def encrypt(plaintext: str) -> str:
    secret = VaultSecret(PASSWORD.encode())
    vault = VaultLib([(DEFAULT_VAULT_ID_MATCH, secret)])
    return vault.encrypt(plaintext, secret=secret).decode()


def use_tree(monkeypatch: pytest.MonkeyPatch, files: dict[str, str]) -> None:
    """``materialize`` recibe este árbol en lugar de exportar un commit."""

    def export(_repository_id: str, _commit: str, dest: Path) -> None:
        write_tree(dest, files)

    monkeypatch.setattr(materialize_module, "export_tree", export)


def bundle(password: str | None = None) -> ResolvedRunBundle:
    return ResolvedRunBundle(
        playbook=ResolvedPlaybook(
            name="site",
            content="",
            git=GitPlaybookSource(
                repository_id="repo",
                url="https://example.com/repo.git",
                commit=COMMIT,
                path=PLAYBOOK,
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


def inventories(tmp_path: Path, config: str | None) -> list[str]:
    """Las rutas, relativas al árbol, de un árbol con ``server-setup/ansible.cfg``."""
    files = {
        PLAYBOOK: PLAY,
        "server-setup/inventory/group_vars/all/main.yml": VARS,
        "server-setup/hosts.ini": "uno\n",
    }
    if config is not None:
        files["server-setup/ansible.cfg"] = config
    write_tree(tmp_path, files)
    found = repository_inventories(tmp_path / PLAYBOOK, tmp_path)
    return [path.relative_to(tmp_path.resolve()).as_posix() for path in found]


class TestRepositoryInventories:
    @pytest.mark.parametrize(
        ("config", "expected"),
        [
            (None, []),
            ("[defaults]\nremote_user = u\n", []),
            ("[defaults]\ninventory = inventory\n", ["server-setup/inventory"]),
            ("[defaults]\ninventory = hosts.ini\n", ["server-setup"]),
            (
                "[defaults]\ninventory = inventory ; comentario\n",
                ["server-setup/inventory"],
            ),
            ("[defaults]\ninventory = no-existe\n", []),
            ("[defaults]\ninventory = localhost,\n", []),
            ("[defaults]\ninventory = ../../fuera\n", []),
            ("[defaults]\ninventory = /etc\n", []),
            ("esto no es un ini\n", []),
            (
                "[defaults]\ninventory = inventory, hosts.ini\n",
                ["server-setup/inventory", "server-setup"],
            ),
        ],
    )
    def test_reads_only_what_the_config_declares(
        self, tmp_path: Path, config: str | None, expected: list[str]
    ) -> None:
        assert inventories(tmp_path, config) == expected

    def test_the_nearest_config_wins(self, tmp_path: Path) -> None:
        write_tree(
            tmp_path,
            {
                PLAYBOOK: PLAY,
                "ansible.cfg": "[defaults]\ninventory = raiz\n",
                "raiz/hosts": "",
                "server-setup/ansible.cfg": "[defaults]\ninventory = cerca\n",
                "server-setup/cerca/hosts": "",
            },
        )

        found = repository_inventories(tmp_path / PLAYBOOK, tmp_path)

        assert found == [(tmp_path / "server-setup/cerca").resolve()]

    def test_a_config_above_the_tree_does_not_count(self, tmp_path: Path) -> None:
        write_tree(
            tmp_path,
            {
                "ansible.cfg": "[defaults]\ninventory = inventory\n",
                "inventory/hosts": "",
                "tree/site.yml": PLAY,
            },
        )

        assert (
            repository_inventories(tmp_path / "tree/site.yml", tmp_path / "tree") == []
        )


class TestCopy:
    def test_copies_both_folders_and_leaves_the_rest(self, tmp_path: Path) -> None:
        project = tmp_path / "project"
        write_tree(
            project,
            {
                PLAYBOOK: PLAY,
                "server-setup/ansible.cfg": CONFIG,
                "server-setup/inventory/hosts.yml": "all: {hosts: {ajeno: {}}}\n",
                "server-setup/inventory/group_vars/all/main.yml": VARS,
                "server-setup/inventory/host_vars/uno.yml": VARS,
            },
        )

        copy_inventory_vars(project / PLAYBOOK, project, tmp_path)

        inventory = tmp_path / "inventory"
        assert (inventory / "group_vars/all/main.yml").read_text() == VARS
        assert (inventory / "host_vars/uno.yml").read_text() == VARS
        assert not (inventory / "hosts.yml").exists()

    def test_a_symlink_is_never_copied(self, tmp_path: Path) -> None:
        secret = tmp_path / "fuera.yml"
        secret.write_text("robado: si\n", encoding="utf-8")
        project = tmp_path / "project"
        write_tree(
            project,
            {
                PLAYBOOK: PLAY,
                "server-setup/ansible.cfg": CONFIG,
                "server-setup/inventory/group_vars/all/main.yml": VARS,
                "otro/host_vars/uno.yml": VARS,
            },
        )
        inventory = project / "server-setup/inventory"
        (inventory / "group_vars/all/robado.yml").symlink_to(secret)
        (inventory / "host_vars").symlink_to(project / "otro/host_vars")

        copy_inventory_vars(project / PLAYBOOK, project, tmp_path)

        copied = tmp_path / "inventory"
        assert (copied / "group_vars/all/main.yml").exists()
        assert not (copied / "group_vars/all/robado.yml").exists()
        assert not (copied / "host_vars").exists()


class TestRealAnsible:
    def tree(self, variables: str, config: str = CONFIG) -> dict[str, str]:
        return {
            PLAYBOOK: PLAY,
            "server-setup/ansible.cfg": config,
            "server-setup/inventory/hosts.yml": "proxmox_vms: {hosts: {ajeno: {}}}\n",
            "server-setup/inventory/group_vars/all/vault.yml": variables,
        }

    def output_of(
        self,
        monkeypatch: pytest.MonkeyPatch,
        files: dict[str, str],
        password: str | None = None,
    ) -> str:
        use_tree(monkeypatch, files)
        materialized = materialize(bundle(password))
        try:
            return run_output(materialized)
        finally:
            cleanup(materialized)

    def test_loads_the_declared_inventorys_variables(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        output = self.output_of(monkeypatch, self.tree(VARS))

        assert "valor=del-repositorio" in output

    def test_the_run_keeps_its_own_hosts(self, monkeypatch: pytest.MonkeyPatch) -> None:
        output = self.output_of(monkeypatch, self.tree(VARS))

        assert "ajeno" not in output

    def test_decrypts_a_vaulted_file_with_the_repository_password(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        output = self.output_of(monkeypatch, self.tree(encrypt(VARS)), PASSWORD)

        assert "valor=del-repositorio" in output

    def test_a_vaulted_file_without_password_says_why(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        output = self.output_of(monkeypatch, self.tree(encrypt(VARS)))

        assert "ecrypt" in output
        assert "valor=" not in output

    def test_without_the_declaration_nothing_is_loaded(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        files = self.tree(VARS, config="[defaults]\nremote_user = u\n")

        output = self.output_of(monkeypatch, files)

        assert "valor=AUSENTE" in output

    def test_only_the_all_group_applies(self, monkeypatch: pytest.MonkeyPatch) -> None:
        files = self.tree("otra: 1\n")
        files["server-setup/inventory/group_vars/proxmox_vms.yml"] = VARS

        output = self.output_of(monkeypatch, files)

        assert "valor=AUSENTE" in output

    def test_what_is_next_to_the_playbook_still_wins(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        files = self.tree(VARS)
        files["server-setup/playbooks/group_vars/all.yml"] = (
            "del_inventario: junto-al-playbook\n"
        )

        output = self.output_of(monkeypatch, files)

        assert "valor=junto-al-playbook" in output
