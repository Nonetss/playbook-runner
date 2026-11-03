"""Secret variables: fetched once, delivered literally, masked, and always removed."""

import asyncio
import os
import stat
import time
from types import SimpleNamespace

import pytest
import requests
from infisical_sdk.infisical_requests import APIError

from app.core.config import settings
from app.grpc.services import runner as runner_module
from app.grpc.services.runner import RunnerServicer
from app.grpc.stubs import (
    Host,
    InfisicalAuth,
    ListInfisicalEnvironmentsRequest,
    ListInfisicalSecretNamesRequest,
    Playbook,
    RunBundleRequest,
    SecretVariable,
    SecretVariables,
)
from app.services.ansible import infisical as infisical_module
from app.services.ansible import materialize as materialize_module
from app.services.ansible import runner as ansible_module
from app.services.ansible.infisical import (
    SecretFetchError,
    fetch_secret_variables,
    invalid_variable_names,
    list_environments,
    list_secret_names,
    masked_values,
)
from app.services.ansible.materialize import (
    cleanup,
    materialize,
    secret_vars_cmdline,
)
from app.services.ansible.models import (
    ResolvedHost,
    ResolvedPlaybook,
    ResolvedRunBundle,
)
from app.services.ansible.runner import (
    REDACTED,
    AnsibleRunner,
    AnsibleRunnerConfig,
    redact_strings,
)

CLIENT_SECRET = "the-client-secret"
VALUE = "s3cret-value"
AUTH = InfisicalAuth(
    url="https://i.example", client_id="cid", client_secret=CLIENT_SECRET
)
HOST = Host(
    name="web", address="10.0.0.1", username="u", private_key="KEY", connection="ssh"
)


def variables(*rows: SecretVariable, environment: str = "dev") -> SecretVariables:
    return SecretVariables(
        auth=AUTH, project_id="project", environment=environment, variables=rows
    )


DB_PASSWORD = SecretVariable(name="db_password", secret_name="DB_PASS", secret_path="/")


def secret(key: str, value: str = VALUE, hidden: bool = False) -> SimpleNamespace:
    return SimpleNamespace(secretKey=key, secretValue=value, secretValueHidden=hidden)


class FakeClient:
    """Lo que el código usa del SDK. Cada instancia registra lo que le piden."""

    def __init__(
        self,
        by_path: dict[str, list] | None = None,
        imports: list | None = None,
        error: Exception | None = None,
        login_error: Exception | None = None,
        environments: object = None,
    ) -> None:
        self.by_path = by_path or {}
        self.imports = imports or []
        self.error = error
        self.login_error = login_error
        self.environments = environments
        self.logins: list[tuple[str, str]] = []
        self.lists: list[dict] = []
        self.auth = SimpleNamespace(universal_auth=SimpleNamespace(login=self._login))
        self.secrets = SimpleNamespace(list_secrets=self._list)
        self.api = SimpleNamespace(
            session=SimpleNamespace(get=self._get, mount=lambda *_: None)
        )

    def _login(self, client_id: str, client_secret: str) -> None:
        self.logins.append((client_id, client_secret))
        if self.login_error:
            raise self.login_error

    def _list(self, **kwargs) -> SimpleNamespace:
        self.lists.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(
            secrets=self.by_path.get(kwargs["secret_path"], []), imports=self.imports
        )

    def _get(self, url: str) -> SimpleNamespace:
        self.lists.append({"url": url})
        if isinstance(self.environments, Exception):
            raise self.environments

        def raise_for_status() -> None:
            pass

        return SimpleNamespace(
            raise_for_status=raise_for_status, json=lambda: self.environments
        )


def use_client(monkeypatch: pytest.MonkeyPatch, client: FakeClient) -> dict:
    created: dict = {}

    def factory(**kwargs) -> FakeClient:
        created.update(kwargs)
        return client

    monkeypatch.setattr(infisical_module, "InfisicalSDKClient", factory)
    return created


def api_error(status: int) -> APIError:
    return APIError(f"answer with {VALUE}", status, {"message": VALUE})


class TestFetch:
    def fetch(self, request: SecretVariables) -> dict[str, str]:
        return asyncio.run(fetch_secret_variables(request))

    def failure(self, request: SecretVariables) -> str:
        with pytest.raises(SecretFetchError) as info:
            self.fetch(request)
        assert VALUE not in str(info.value)
        assert CLIENT_SECRET not in str(info.value)
        return str(info.value)

    def test_returns_values_by_variable_with_the_cache_disabled(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = FakeClient({"/": [secret("DB_PASS")]})
        created = use_client(monkeypatch, client)

        assert self.fetch(variables(DB_PASSWORD, environment="prod")) == {
            "db_password": VALUE
        }
        assert created == {"host": "https://i.example", "cache_ttl": None}
        assert client.logins == [("cid", CLIENT_SECRET)]
        assert client.lists == [
            {
                "environment_slug": "prod",
                "secret_path": "/",
                "project_id": "project",
                "view_secret_value": True,
            }
        ]

    def test_reads_each_path_once(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = FakeClient(
            {"/": [secret("A"), secret("B")], "/app": [secret("C", "other")]}
        )
        use_client(monkeypatch, client)

        values = self.fetch(
            variables(
                SecretVariable(name="a", secret_name="A", secret_path="/"),
                SecretVariable(name="b", secret_name="B", secret_path="/"),
                SecretVariable(name="c", secret_name="C", secret_path="/app"),
            )
        )

        assert values == {"a": VALUE, "b": VALUE, "c": "other"}
        assert len(client.lists) == 2

    def test_imported_secrets_count_but_own_ones_win(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        imported = SimpleNamespace(
            secrets=[secret("OWN", "imported"), secret("SHARED", "shared")]
        )
        use_client(
            monkeypatch, FakeClient({"/": [secret("OWN", "own")]}, imports=[imported])
        )

        assert self.fetch(
            variables(
                SecretVariable(name="own", secret_name="OWN", secret_path="/"),
                SecretVariable(name="shared", secret_name="SHARED", secret_path="/"),
            )
        ) == {"own": "own", "shared": "shared"}

    def test_a_missing_secret_names_the_variable(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(monkeypatch, FakeClient({"/": []}))

        message = self.failure(variables(DB_PASSWORD))

        assert "db_password" in message
        assert "DB_PASS" in message

    def test_a_hidden_value_is_unreadable_not_a_placeholder(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(
            monkeypatch,
            FakeClient({"/": [secret("DB_PASS", "<hidden-by-infisical>", True)]}),
        )

        assert "db_password" in self.failure(variables(DB_PASSWORD))

    @pytest.mark.parametrize("status", [401, 403, 404, 500])
    def test_an_api_error_never_repeats_the_answer(
        self, monkeypatch: pytest.MonkeyPatch, status: int
    ) -> None:
        use_client(monkeypatch, FakeClient(error=api_error(status)))

        assert "db_password" in self.failure(variables(DB_PASSWORD))

    def test_a_rejected_login_is_reported(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(monkeypatch, FakeClient(login_error=api_error(401)))

        assert "rejected" in self.failure(variables(DB_PASSWORD))

    def test_a_network_failure_is_reported(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(
            monkeypatch,
            FakeClient(error=requests.ConnectionError(f"https://x?t={VALUE}")),
        )

        assert "reach Infisical" in self.failure(variables(DB_PASSWORD))

    def test_a_hung_instance_times_out(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(settings, "infisical_timeout_s", 0.01)
        monkeypatch.setattr(
            infisical_module, "_read_variables", lambda _: time.sleep(0.2)
        )

        assert "in time" in self.failure(variables(DB_PASSWORD))


class TestListings:
    REQUEST = ListInfisicalSecretNamesRequest(
        auth=AUTH, project_id="project", environment="dev", secret_path="/"
    )
    ENVIRONMENTS = ListInfisicalEnvironmentsRequest(auth=AUTH, project_id="project")

    def test_names_never_ask_for_values(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = FakeClient({"/": [secret("B"), secret("A")]})
        use_client(monkeypatch, client)

        assert asyncio.run(list_secret_names(self.REQUEST)) == ["A", "B"]
        assert client.lists[0]["view_secret_value"] is False

    def test_names_failure_is_safe(self, monkeypatch: pytest.MonkeyPatch) -> None:
        use_client(monkeypatch, FakeClient(error=api_error(403)))

        with pytest.raises(SecretFetchError) as info:
            asyncio.run(list_secret_names(self.REQUEST))
        assert VALUE not in str(info.value)

    def test_environments_read_the_workspace_route(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = FakeClient(
            environments={
                "workspace": {
                    "environments": [
                        {"id": "1", "name": "Development", "slug": "dev"},
                        {"id": "2", "slug": "prod"},
                    ]
                }
            }
        )
        use_client(monkeypatch, client)

        assert asyncio.run(list_environments(self.ENVIRONMENTS)) == [
            ("dev", "Development"),
            ("prod", "prod"),
        ]
        assert client.lists == [{"url": "https://i.example/api/v1/workspace/project"}]

    @pytest.mark.parametrize(
        "client",
        [
            FakeClient(environments=requests.ConnectionError("down")),
            FakeClient(environments={"unexpected": True}),
            FakeClient(environments={"workspace": None}),
            FakeClient(environments=ValueError("not json")),
            FakeClient(login_error=api_error(401)),
        ],
    )
    def test_environments_degrade_to_an_empty_list(
        self, monkeypatch: pytest.MonkeyPatch, client: FakeClient
    ) -> None:
        use_client(monkeypatch, client)

        assert asyncio.run(list_environments(self.ENVIRONMENTS)) == []

    def test_rpc_names_failure_aborts_unavailable(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(monkeypatch, FakeClient(error=api_error(403)))
        aborted: list = []

        class Context(FakeContext):
            async def abort(self, code, details):
                aborted.append((code, details))
                raise Stop

        with pytest.raises(Stop):
            asyncio.run(
                RunnerServicer().ListInfisicalSecretNames(self.REQUEST, Context())
            )

        assert aborted[0][0].name == "UNAVAILABLE"
        assert VALUE not in aborted[0][1]

    def test_rpc_responses_hold_only_names_and_slugs(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(
            monkeypatch,
            FakeClient(
                {"/": [secret("A")]},
                environments={"workspace": {"environments": [{"slug": "dev"}]}},
            ),
        )

        names = asyncio.run(
            RunnerServicer().ListInfisicalSecretNames(self.REQUEST, FakeContext())
        )
        environments = asyncio.run(
            RunnerServicer().ListInfisicalEnvironments(self.ENVIRONMENTS, FakeContext())
        )

        assert list(names.names) == ["A"]
        assert VALUE not in str(names)
        assert [env.slug for env in environments.environments] == ["dev"]


class TestMaskedValues:
    def test_longest_first_so_a_contained_value_leaves_nothing(self) -> None:
        masked = masked_values(["abcd", "abcdefgh"], "client")

        assert redact_strings("abcdefgh abcd", masked) == f"{REDACTED} {REDACTED}"

    def test_also_masks_the_json_escaped_form(self) -> None:
        masked = masked_values(['li"ne1\nline2'], "")

        assert redact_strings('"msg": "li\\"ne1\\nline2"', masked) == (
            f'"msg": "{REDACTED}"'
        )

    def test_short_values_are_not_masked(self) -> None:
        assert masked_values(["abc", "abcd"], "") == ["abcd"]

    def test_the_client_secret_is_always_masked(self) -> None:
        assert masked_values([], "abc") == ["abc"]

    def test_invalid_names(self) -> None:
        assert invalid_variable_names(
            ["ok", "ansible_host", "ANSIBLE_x", "a b", "a: !x"]
        ) == ["ANSIBLE_x", "a b", "a: !x", "ansible_host"]


class FakeContext:
    def peer(self) -> str:
        return "ipv4:127.0.0.1:1"

    async def abort(self, code, details):
        raise AssertionError(f"unexpected abort: {code} {details}")


class Stop(Exception):
    pass


def run_bundle_request(
    secret_variables: SecretVariables | None, extravars: dict | None = None
) -> RunBundleRequest:
    return RunBundleRequest(
        playbook=Playbook(name="p", content="- hosts: all\n"),
        hosts=[HOST],
        extravars=extravars or {},
        secret_variables=secret_variables,
    )


def frames_of(request: RunBundleRequest) -> list:
    async def collect() -> list:
        return [f async for f in RunnerServicer().RunBundle(request, FakeContext())]

    return asyncio.run(collect())


class TestRunBundle:
    def captured_config(
        self, monkeypatch: pytest.MonkeyPatch, request: RunBundleRequest
    ) -> tuple[AnsibleRunnerConfig, bool, str]:
        """Runs ``RunBundle`` until it builds the runner; the file is gone by then
        only if ``cleanup`` ran, so its state is captured at that moment."""
        seen: list = []

        def capture(config: AnsibleRunnerConfig):
            path = str(config.cmdline or "").removeprefix("-e @").strip("'")
            mode = stat.S_IMODE(os.stat(path).st_mode) if path else 0
            content = open(path, encoding="utf-8").read() if path else ""
            seen.append((config, mode == 0o600, content))
            raise Stop

        monkeypatch.setattr(runner_module, "AnsibleRunner", capture)
        with pytest.raises(Stop):
            frames_of(request)
        return seen[0]

    def test_values_reach_a_private_file_not_the_environment(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        use_client(monkeypatch, FakeClient({"/": [secret("DB_PASS")]}))

        config, private, content = self.captured_config(
            monkeypatch, run_bundle_request(variables(DB_PASSWORD))
        )

        assert private
        assert VALUE in content
        assert "!unsafe" in content
        env = config.run_kwargs()["envvars"]
        assert not [key for key in env if key.startswith("INFISICAL_")]
        assert VALUE not in str(env)
        assert VALUE not in str(config.extravars)
        assert config.redact == sorted([VALUE, CLIENT_SECRET], key=len, reverse=True)
        assert config.run_kwargs()["quiet"] is True

    def test_a_run_without_variables_contacts_nothing(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(infisical_module, "InfisicalSDKClient", None)

        config, _, _ = self.captured_config(monkeypatch, run_bundle_request(None))

        assert config.cmdline is None
        assert config.redact == []
        assert "quiet" not in config.run_kwargs()

    @pytest.mark.parametrize(
        ("client", "request_", "expected"),
        [
            (
                FakeClient({"/": []}),
                run_bundle_request(variables(DB_PASSWORD)),
                "db_password",
            ),
            (
                FakeClient(error=api_error(403)),
                run_bundle_request(variables(DB_PASSWORD)),
                "db_password",
            ),
            (
                FakeClient({"/": [secret("DB_PASS")]}),
                run_bundle_request(variables(DB_PASSWORD), {"db_password": "typed"}),
                "db_password",
            ),
            (
                FakeClient({"/": [secret("A")]}),
                run_bundle_request(
                    variables(
                        SecretVariable(
                            name="ansible_host", secret_name="A", secret_path="/"
                        )
                    )
                ),
                "ansible_host",
            ),
        ],
    )
    def test_a_failure_is_one_error_frame_and_ansible_never_starts(
        self,
        monkeypatch: pytest.MonkeyPatch,
        client: FakeClient,
        request_: RunBundleRequest,
        expected: str,
    ) -> None:
        use_client(monkeypatch, client)

        def unreachable(*_):
            raise AssertionError("materialized after a failed fetch")

        monkeypatch.setattr(runner_module, "materialize", unreachable)

        frames = frames_of(request_)

        assert len(frames) == 1
        assert expected in frames[0].error
        assert VALUE not in frames[0].error


TRICKY = [
    "abc{{ 7*6 }}def",
    '{% raw %}"quoted"',
    "'single' \"double\"",
    "line1\nline2\n",
    "ñandú 🦤   \x7f",
    "!unsafe: {a: [b]} # no comment",
]


def bundle(name: str = "p") -> ResolvedRunBundle:
    return ResolvedRunBundle(
        playbook=ResolvedPlaybook(
            name=name,
            content=(
                "- hosts: localhost\n"
                "  gather_facts: false\n"
                "  tasks:\n"
                + "".join(
                    f"    - ansible.builtin.debug:\n        var: v{i}\n"
                    for i in range(len(TRICKY))
                )
            ),
        ),
        hosts=[
            ResolvedHost(
                name="web",
                address="10.0.0.1",
                username="u",
                privateKey="KEY",
                connection="ssh",
            )
        ],
    )


class TestDelivery:
    def run(self, tmp_path_name: str, redact: list[str]) -> tuple[list, object]:
        values = {f"v{i}": value for i, value in enumerate(TRICKY)}
        materialized = materialize(bundle(tmp_path_name), values)
        assert materialized.secret_vars_path is not None
        runner = AnsibleRunner(
            AnsibleRunnerConfig(
                playbook=materialized.playbook,
                private_data_dir=str(materialized.run_dir),
                project_dir=str(materialized.project_dir),
                inventory=materialized.inventory,
                cmdline=secret_vars_cmdline(materialized.secret_vars_path),
                redact=redact,
            )
        )

        async def collect() -> list:
            return [event async for event in runner.stream()]

        try:
            return asyncio.run(collect()), runner
        finally:
            cleanup(materialized)

    def test_real_ansible_receives_every_value_literally(self) -> None:
        events, runner = self.run("plain", [])

        assert runner.rc == 0  # pyright: ignore[reportAttributeAccessIssue]
        results = [
            event["event_data"]["res"]
            for event in events
            if event["event"] == "runner_on_ok"
        ]
        assert [r[f"v{i}"] for i, r in enumerate(results)] == TRICKY

    def test_a_playbook_name_with_quotes_and_spaces_still_runs(self) -> None:
        _, runner = self.run('it\'s a "name" $(x)', [])

        assert runner.rc == 0  # pyright: ignore[reportAttributeAccessIssue]

    def test_real_ansible_output_is_masked(self) -> None:
        events, _ = self.run("masked", masked_values(TRICKY, CLIENT_SECRET))

        text = str([e for e in events if e["event"] == "runner_on_ok"])
        for value in ("abc{{ 7*6 }}def", "{% raw %}", "line1"):
            assert value not in text
        assert REDACTED in text


@pytest.mark.skipif(os.name != "posix", reason="POSIX file modes")
class TestSecretFile:
    def test_is_private_and_removed_by_cleanup(self) -> None:
        materialized = materialize(bundle(), {"v0": VALUE})
        path = materialized.secret_vars_path
        assert path is not None
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
        assert VALUE in path.read_text()

        cleanup(materialized)

        assert not path.exists()
        assert not materialized.run_dir.exists()

    def test_a_failed_write_leaves_nothing(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def fail(*_):
            raise OSError("disk full")

        monkeypatch.setattr(materialize_module, "_write_secret_vars", fail)
        before = set(settings_dirs())

        with pytest.raises(OSError):
            materialize(bundle(), {"v0": VALUE})

        assert set(settings_dirs()) == before

    def test_no_values_means_no_file(self) -> None:
        materialized = materialize(bundle())

        assert materialized.secret_vars_path is None
        cleanup(materialized)


def settings_dirs() -> list[str]:
    root = settings.run_scratch_dir
    return os.listdir(root) if os.path.isdir(root) else []


class TestRedact:
    def test_replaces_nested_strings(self) -> None:
        event = {
            "stdout": f"x {VALUE} y",
            "counter": 3,
            "event_data": {"res": {"msg": VALUE, "results": [{"a": VALUE}]}},
        }

        assert redact_strings(event, [VALUE]) == {
            "stdout": f"x {REDACTED} y",
            "counter": 3,
            "event_data": {"res": {"msg": REDACTED, "results": [{"a": REDACTED}]}},
        }

    def stream(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path, redact: list[str]
    ) -> tuple[list, list]:
        event = {"event": "runner_on_failed", "event_data": {"res": {"msg": VALUE}}}
        logged: list = []

        def fake_run(**kwargs):
            kwargs["event_handler"](event)

        monkeypatch.setattr(ansible_module.ansible_runner, "run", fake_run)
        runner = AnsibleRunner(
            AnsibleRunnerConfig(
                private_data_dir=str(tmp_path),
                project_dir=str(tmp_path),
                redact=redact,
                event_handler=logged.append,
            )
        )

        async def collect() -> list:
            return [e async for e in runner.stream()]

        return asyncio.run(collect()), logged

    def test_masks_events_and_logs(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path
    ) -> None:
        streamed, logged = self.stream(monkeypatch, tmp_path, [VALUE])

        assert VALUE not in str(streamed)
        assert VALUE not in str(logged)
        assert REDACTED in str(streamed)

    def test_no_secrets_leaves_events_unchanged(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path
    ) -> None:
        streamed, logged = self.stream(monkeypatch, tmp_path, [])

        assert VALUE in str(streamed)
        assert VALUE in str(logged)

    def test_an_empty_secret_is_ignored(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path
    ) -> None:
        streamed, _ = self.stream(monkeypatch, tmp_path, [""])

        assert REDACTED not in str(streamed)
