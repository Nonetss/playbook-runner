"""The runner refuses reserved extra vars on its own, before running Ansible."""

import asyncio

import pytest

from app.grpc.services import runner as runner_module
from app.grpc.services.runner import RunnerServicer
from app.grpc.stubs import Host, Playbook, RunBundleRequest


class FakeContext:
    def peer(self) -> str:
        return "ipv4:127.0.0.1:1"

    async def abort(self, code, details):
        raise AssertionError(f"unexpected abort: {code} {details}")


class Reached(Exception):
    pass


def request(extravars: dict[str, str]) -> RunBundleRequest:
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
        extravars=extravars,
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
def test_ordinary_extra_vars_reach_materialize() -> None:
    # Control case: proves the spy above sits on the path a run really takes.
    with pytest.raises(Reached):
        asyncio.run(collect(request({"app_version": "1.2.3"})))
