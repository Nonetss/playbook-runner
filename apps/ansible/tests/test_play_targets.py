"""El ``hosts`` de un playbook no decide nada: manda la selección del run."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
import yaml

from app.services.ansible.materialize import cleanup, materialize
from app.services.ansible.models import (
    ResolvedHost,
    ResolvedPlaybook,
    ResolvedRunBundle,
)
from app.services.ansible.play_targets import retarget_playbook, retarget_plays
from app.services.ansible.runner import AnsibleRunner, AnsibleRunnerConfig


@pytest.mark.parametrize(
    "hosts",
    [
        "docker_hosts",
        "localhost",
        '"web:&prod"',
        "'{{ destino }}'",
        "all:!prod",
        "[web, db]",
        "\n    - web\n    - db",
        "|\n    web",
    ],
)
def test_any_pattern_becomes_all(hosts: str) -> None:
    text = f"- name: x\n  hosts: {hosts}\n  tasks: []\n"

    plays = yaml.safe_load(retarget_plays(text))

    assert plays == [{"name": "x", "hosts": "all", "tasks": []}]


def test_keeps_everything_else_byte_for_byte() -> None:
    text = (
        "---\n"
        "# cabecera\n"
        "- hosts: web # solo web\n"
        "  vars:\n"
        "    hosts: no_me_toques\n"
        "    raw: !unsafe '{{ x }}'\n"
        "    secret: !vault |\n"
        "      $ANSIBLE_VAULT;1.1;AES256\n"
        "      6162\n"
        "  tasks:\n"
        "    - debug: {msg: 'hosts: web'}\n"
        "- hosts: db\n"
        "  tasks: []\n"
    )

    assert retarget_plays(text) == text.replace("- hosts: web", "- hosts: all").replace(
        "- hosts: db", "- hosts: all"
    )


def test_a_file_that_is_not_a_list_of_plays_is_untouched() -> None:
    assert retarget_plays("hosts: web\n") == "hosts: web\n"
    assert retarget_plays("") == ""


def test_follows_imports_within_the_project(tmp_path: Path) -> None:
    (tmp_path / "sub").mkdir()
    main = tmp_path / "main.yml"
    main.write_text(
        "- hosts: a\n"
        "- import_playbook: sub/one.yml\n"
        "- ansible.builtin.import_playbook: sub/one.yml\n"
        "- import_playbook: '{{ dinamico }}.yml'\n"
        "- import_playbook: missing.yml\n"
    )
    (tmp_path / "sub" / "one.yml").write_text(
        "- hosts: b\n- import_playbook: two.yml\n- import_playbook: ../main.yml\n"
    )
    (tmp_path / "sub" / "two.yml").write_text("- hosts: c\n")

    retarget_playbook(main, tmp_path)

    assert main.read_text().startswith("- hosts: all\n")
    assert (tmp_path / "sub" / "one.yml").read_text().startswith("- hosts: all\n")
    assert (tmp_path / "sub" / "two.yml").read_text() == "- hosts: all\n"


def test_never_writes_outside_the_project(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()
    outside = tmp_path / "outside.yml"
    outside.write_text("- hosts: fuera\n")
    (project / "link.yml").symlink_to(outside)
    main = project / "main.yml"
    main.write_text(
        "- import_playbook: ../outside.yml\n- import_playbook: link.yml\n- hosts: a\n"
    )

    retarget_playbook(main, project)

    assert outside.read_text() == "- hosts: fuera\n"
    assert "- hosts: all\n" in main.read_text()


@pytest.mark.parametrize(
    "text",
    [
        "- hosts: [unclosed\n",
        "x: &a web\n- nope\n",
        "- hosts: &grupo web\n- hosts: *grupo\n",
    ],
)
def test_what_cannot_be_rewritten_stays_for_ansible_to_judge(
    tmp_path: Path, text: str
) -> None:
    path = tmp_path / "p.yml"
    path.write_text(text)

    retarget_playbook(path, tmp_path)

    assert path.read_text() == text


def _bundle(content: str) -> ResolvedRunBundle:
    return ResolvedRunBundle(
        playbook=ResolvedPlaybook(name="p", content=content),
        hosts=[
            ResolvedHost(
                name=name,
                address="127.0.0.1",
                username="u",
                privateKey="KEY",
                connection="local",
            )
            for name in ("uno", "dos")
        ],
    )


def test_every_play_runs_on_the_selection_in_real_ansible() -> None:
    materialized = materialize(
        _bundle(
            "- hosts: docker_hosts\n"
            "  gather_facts: false\n"
            "  tasks:\n"
            "    - ansible.builtin.debug:\n"
            "        msg: 'A {{ inventory_hostname }}'\n"
            "- hosts: localhost\n"
            "  gather_facts: false\n"
            "  tasks:\n"
            "    - ansible.builtin.debug:\n"
            "        msg: 'B {{ inventory_hostname }}'\n"
        )
    )
    runner = AnsibleRunner(
        AnsibleRunnerConfig(
            playbook=materialized.playbook,
            private_data_dir=str(materialized.run_dir),
            project_dir=str(materialized.project_dir),
            inventory=materialized.inventory,
        )
    )

    async def collect() -> list:
        return [event async for event in runner.stream()]

    try:
        output = "\n".join(str(event) for event in asyncio.run(collect()))
    finally:
        cleanup(materialized)

    for message in ("A uno", "A dos", "B uno", "B dos"):
        assert message in output
    assert "B localhost" not in output
