import pytest

from app.core.config import settings
from app.grpc.stubs import GitSource, Host, Playbook
from app.services.ansible.models import host_from_proto, playbook_from_proto
from app.services.ansible.payload import event_payload
from app.services.ansible.ssh_policy import known_hosts_path, ssh_envvars


class TestEventPayload:
    def test_maps_task_result_fields(self) -> None:
        payload = event_payload(
            {
                "event": "runner_on_ok",
                "event_data": {
                    "host": "web",
                    "play": "Deploy",
                    "task": "Restart",
                    "task_action": "ansible.builtin.service",
                    "res": {"changed": True, "msg": "ok", "stdout": "", "rc": 0},
                },
            }
        )
        assert payload == {
            "event": "runner_on_ok",
            "host": "web",
            "play": "Deploy",
            "task": "Restart",
            "task_action": "ansible.builtin.service",
            "changed": True,
            "msg": "ok",
            "stdout": "",
            "stderr": None,
            "rc": 0,
        }

    def test_json_encodes_non_string_text_fields(self) -> None:
        payload = event_payload(
            {
                "event": "runner_on_failed",
                "event_data": {
                    "res": {"msg": ["a", "ñ"], "stdout": {"k": 1}, "stderr": 3},
                },
            }
        )
        assert payload["msg"] == '["a", "ñ"]'
        assert payload["stdout"] == '{"k": 1}'
        assert payload["stderr"] == "3"

    def test_handles_missing_event_data(self) -> None:
        payload = event_payload({"event": "verbose"})
        assert payload["event"] == "verbose"
        assert "stats" not in payload

    def test_adds_stats_only_for_playbook_on_stats(self) -> None:
        payload = event_payload(
            {
                "event": "playbook_on_stats",
                "event_data": {"ok": {"web": 2}, "failures": {"db": 1}},
            }
        )
        assert payload["stats"] == {
            "ok": {"web": 2},
            "changed": {},
            "failures": {"db": 1},
            "dark": {},
            "skipped": {},
        }
        other = event_payload({"event": "runner_on_ok", "event_data": {"ok": {}}})
        assert "stats" not in other


class TestProtoConversion:
    def test_inline_playbook(self) -> None:
        playbook = playbook_from_proto(Playbook(name="p", content="- hosts: all\n"))
        assert playbook.name == "p"
        assert playbook.content == "- hosts: all\n"
        assert playbook.git is None

    @pytest.mark.parametrize("private_key", [None, "KEY"])
    def test_git_playbook(self, private_key: str | None) -> None:
        source = GitSource(
            repository_id="r", url="https://x", commit="c" * 40, path="site.yml"
        )
        if private_key is not None:
            source.private_key = private_key
        playbook = playbook_from_proto(Playbook(name="p", content="", git=source))

        assert playbook.git is not None
        assert playbook.git.repository_id == "r"
        assert playbook.git.url == "https://x"
        assert playbook.git.commit == "c" * 40
        assert playbook.git.path == "site.yml"
        assert playbook.git.private_key == private_key

    @pytest.mark.parametrize("port", [None, 0, 2222])
    def test_host(self, port: int | None) -> None:
        message = Host(
            name="web",
            address="10.0.0.1",
            username="deploy",
            private_key="KEY",
            connection="ssh",
        )
        if port is not None:
            message.port = port
        host = host_from_proto(message)

        assert host.name == "web"
        assert host.address == "10.0.0.1"
        assert host.username == "deploy"
        assert host.privateKey == "KEY"
        assert host.connection == "ssh"
        assert host.port == port


class TestSshEnvvars:
    def test_accept_new(self) -> None:
        envvars = ssh_envvars()
        assert envvars["ANSIBLE_HOST_KEY_CHECKING"] == "True"
        assert "-o StrictHostKeyChecking=accept-new" in envvars["ANSIBLE_SSH_ARGS"]
        assert (
            f"-o UserKnownHostsFile={known_hosts_path()}" in envvars["ANSIBLE_SSH_ARGS"]
        )

    def test_strict(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "ssh_host_key_policy", "strict")
        envvars = ssh_envvars()
        assert envvars["ANSIBLE_HOST_KEY_CHECKING"] == "True"
        assert "-o StrictHostKeyChecking=yes" in envvars["ANSIBLE_SSH_ARGS"]

    def test_off(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "ssh_host_key_policy", "off")
        envvars = ssh_envvars()
        assert envvars["ANSIBLE_HOST_KEY_CHECKING"] == "False"
        assert "-o UserKnownHostsFile=/dev/null" in envvars["ANSIBLE_SSH_ARGS"]

    def test_keeps_the_default_ssh_args(self) -> None:
        assert ssh_envvars()["ANSIBLE_SSH_ARGS"].startswith(
            "-C -o ControlMaster=auto -o ControlPersist=60s"
        )

    def test_known_hosts_lives_in_the_state_dir(self, tmp_path) -> None:
        assert known_hosts_path() == (tmp_path / "state" / "known_hosts").resolve()
