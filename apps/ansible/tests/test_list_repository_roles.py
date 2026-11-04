"""``ListRepositoryRoles`` reads the mirror and maps Git errors to gRPC codes."""

import asyncio

import grpc
import pytest

from app.grpc.services import runner as runner_module
from app.grpc.services.runner import RunnerServicer
from app.grpc.stubs import ListRepositoryRolesRequest, PlaybookRoles, RepositoryRole
from app.services.git import mirror
from app.services.git.discover import DiscoveredRoles, PlaybookRoleUsage


class Aborted(Exception):
    def __init__(self, code: grpc.StatusCode) -> None:
        self.code = code


class FakeContext:
    def peer(self) -> str:
        return "ipv4:127.0.0.1:1"

    async def abort(self, code, details):
        raise Aborted(code)


def call(git_mirror, commit: str):
    request = ListRepositoryRolesRequest(
        repository_id=git_mirror.repository_id,
        url="https://example.invalid/repo.git",
        commit=commit,
    )
    return asyncio.run(RunnerServicer().ListRepositoryRoles(request, FakeContext()))


def test_lists_the_commits_roles(git_mirror) -> None:
    response = call(git_mirror, git_mirror.commit)

    assert list(response.roles) == [RepositoryRole(name="x", path="roles/x")]
    assert not response.roles[0].HasField("description")
    assert list(response.requirements_files) == []
    assert list(response.playbook_roles) == []


def test_maps_each_playbooks_roles(git_mirror, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        runner_module,
        "discover_roles",
        lambda *_args: DiscoveredRoles(
            playbook_roles=[
                PlaybookRoleUsage(path="site.yml", roles=["x"], dynamic=True)
            ]
        ),
    )

    response = call(git_mirror, git_mirror.commit)

    assert list(response.playbook_roles) == [
        PlaybookRoles(path="site.yml", roles=["x"], dynamic=True)
    ]


def test_invalid_commit_is_a_grpc_error(git_mirror) -> None:
    with pytest.raises(Aborted) as aborted:
        call(git_mirror, "not-a-commit")

    assert aborted.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_unknown_commit_is_not_found(
    git_mirror, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(mirror, "_fetch_all", lambda *_args: None)

    with pytest.raises(Aborted) as aborted:
        call(git_mirror, "0" * 40)

    assert aborted.value.code == grpc.StatusCode.NOT_FOUND
