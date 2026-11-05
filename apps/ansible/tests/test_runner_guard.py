"""The runner refuses reserved extra vars on its own, before running Ansible."""

import asyncio
import json
from typing import Any

import pytest

from app.core.config import settings
from app.grpc.services import runner as runner_module
from app.grpc.services.runner import RunnerServicer
from app.grpc.stubs import Host, Playbook, RunBundleRequest
from app.services.ansible.runner import AnsibleRunnerConfig
from app.services.git.mirror import GitError


class FakeContext:
    def peer(self) -> str:
        return "ipv4:127.0.0.1:1"

    async def abort(self, code, details):
        raise AssertionError(f"unexpected abort: {code} {details}")


class Reached(Exception):
    pass


def request(extravars: dict[str, Any]) -> RunBundleRequest:
    return RunBundleRequest(
        playbook=Playbook(name="p", content="- hosts: all\n"),
        hosts=[
            Host(
                name="web",
                address="10.0.0.1",
                username="u",
                private_key="KEY",
                connection="ssh",
            )
        ],
        extravars_json=json.dumps(extravars),
    )


async def collect(req: RunBundleRequest) -> list:
    return [frame async for frame in RunnerServicer().RunBundle(req, FakeContext())]


@pytest.fixture
def materialize_spy(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(*_args, **_kwargs):
        raise Reached

    monkeypatch.setattr(runner_module, "materialize", fail)
    monkeypatch.setattr(runner_module, "AnsibleRunner", fail)


@pytest.mark.usefixtures("materialize_spy")
@pytest.mark.parametrize("key", ["ansible_host", "ANSIBLE_ssh_args", "Ansible_become"])
def test_reserved_extra_vars_are_refused(key: str) -> None:
    frames = asyncio.run(collect(request({key: "x", "ok": "1"})))

    assert len(frames) == 1
    assert frames[0].HasField("error")
    assert key in frames[0].error


@pytest.mark.usefixtures("materialize_spy")
@pytest.mark.parametrize(
    ("raw", "message"), [("{broken", "valid JSON"), ("[1]", "JSON object")]
)
def test_extra_vars_that_are_not_an_object_are_refused(raw: str, message: str) -> None:
    req = request({})
    req.extravars_json = raw

    frames = asyncio.run(collect(req))

    assert len(frames) == 1
    assert message in frames[0].error


def test_extra_vars_keep_their_type_on_the_way_to_ansible(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configs: list[AnsibleRunnerConfig] = []

    class Stop(Exception):
        pass

    class FakeRunner:
        def __init__(self, config: AnsibleRunnerConfig) -> None:
            configs.append(config)
            raise Stop

    monkeypatch.setattr(runner_module, "AnsibleRunner", FakeRunner)
    value = {"flag": False, "count": 2, "ports": [{"port": "22"}], "name": "a"}

    with pytest.raises(Stop):
        asyncio.run(collect(request(value)))

    assert configs[0].extravars == {
        "ansible_become_user": settings.ansible_become_user,
        **value,
    }


def test_a_role_that_cannot_be_disabled_ends_the_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail(*_args, **_kwargs):
        raise GitError("not_found", "Roles not found: gone")

    monkeypatch.setattr(runner_module, "materialize", fail)

    frames = asyncio.run(collect(request({})))

    assert len(frames) == 1
    assert frames[0].error == "Roles not found: gone"


@pytest.mark.usefixtures("materialize_spy")
def test_ordinary_extra_vars_reach_materialize() -> None:
    # Control case: proves the spy above sits on the path a run really takes.
    with pytest.raises(Reached):
        asyncio.run(collect(request({"app_version": "1.2.3"})))
