import asyncio

from app.grpc.services.runner import RunnerServicer
from app.grpc.stubs import ListPlaybookVariablesRequest, PlaybookVariable
from app.services.git.discover import MAX_PLAYBOOK_BYTES, inline_playbook_variables


class FakeContext:
    def peer(self) -> str:
        return "test"


def names(content: str) -> list[tuple[str, str | None, str | None]]:
    return [(v.name, v.value, v.role) for v in inline_playbook_variables(content)]


def test_vars_of_every_play() -> None:
    content = (
        "- hosts: all\n  vars: {port: 80}\n"
        "- hosts: web\n  vars: {path: /srv, port: 81}\n"
    )
    assert names(content) == [("port", "80", None), ("path", "/srv", None)]


def test_same_rules_for_values_as_a_git_playbook() -> None:
    content = (
        "- hosts: all\n  vars:\n    db_password: hunter2\n    items_list: [1]\n"
        "    ansible_user: root\n    vaulted: !vault |\n      $ANSIBLE_VAULT;1.1\n"
    )
    assert names(content) == [
        ("db_password", None, None),
        ("items_list", "[1]", None),
        ("ansible_user", "root", None),
        ("vaulted", None, None),
    ]


def test_nothing_to_follow_from_a_single_file() -> None:
    content = (
        "- import_playbook: other.yml\n"
        "- hosts: all\n  vars_files: [a.yml]\n  roles: [web]\n  vars: {kept: 1}\n"
    )
    assert names(content) == [("kept", "1", None)]


def test_content_that_cannot_be_read_has_no_variables() -> None:
    assert names("- hosts: [unclosed\n") == []
    assert names("just text\n") == []
    assert names("") == []
    assert names("#" * (MAX_PLAYBOOK_BYTES + 1)) == []


def test_rpc_maps_the_variables() -> None:
    request = ListPlaybookVariablesRequest(
        content="- hosts: all\n  vars: {port: 80, api_token: x}\n"
    )

    response = asyncio.run(
        RunnerServicer().ListPlaybookVariables(request, FakeContext())
    )

    assert list(response.variables) == [
        PlaybookVariable(name="port", value="80", value_type="number"),
        PlaybookVariable(name="api_token", value_type="text"),
    ]
    assert not response.variables[1].HasField("value")
