"""Autenticación del runner en remotos Git: clave SSH o token por HTTPS."""

from __future__ import annotations

import base64

import pytest

from app.services.git import mirror
from app.services.git.auth import GitAuth, git_auth


def _basic(user: str, token: str) -> str:
    return (
        "Authorization: Basic " + base64.b64encode(f"{user}:{token}".encode()).decode()
    )


def test_no_credential_is_no_auth() -> None:
    assert git_auth(None, None, None) is None
    assert git_auth("", "alice", None) is None


def test_token_and_key_are_kept() -> None:
    assert git_auth(None, "alice", "t0ken") == GitAuth(username="alice", token="t0ken")
    assert git_auth("KEY", None, None) == GitAuth(private_key="KEY")


def test_token_goes_as_a_header_scoped_to_the_repository_host() -> None:
    with mirror._git_env(
        "https://github.com/acme/infra.git", GitAuth(username="alice", token="t0ken")
    ) as env:
        assert env["GIT_CONFIG_COUNT"] == "1"
        assert env["GIT_CONFIG_KEY_0"] == "http.https://github.com/.extraHeader"
        assert env["GIT_CONFIG_VALUE_0"] == _basic("alice", "t0ken")
        # Nothing else reaches git: global config stays off and no prompt.
        assert env["GIT_TERMINAL_PROMPT"] == "0"


def test_the_port_is_part_of_the_scope() -> None:
    with mirror._git_env(
        "https://git.example.com:8443/acme/infra.git",
        GitAuth(username="alice", token="t0ken"),
    ) as env:
        assert (
            env["GIT_CONFIG_KEY_0"] == "http.https://git.example.com:8443/.extraHeader"
        )


def test_a_token_without_username_uses_the_github_default() -> None:
    with mirror._git_env(
        "https://github.com/acme/infra.git", GitAuth(token="t0ken")
    ) as env:
        assert env["GIT_CONFIG_VALUE_0"] == _basic("x-access-token", "t0ken")


@pytest.mark.parametrize(
    "url", ["ssh://git@github.com/acme/infra.git", "git@github.com:acme/infra.git"]
)
def test_a_token_needs_an_https_url(url: str) -> None:
    with pytest.raises(mirror.GitError) as raised:
        with mirror._git_env(url, GitAuth(username="alice", token="t0ken")):
            pass
    assert raised.value.kind == "invalid"


def test_a_key_adds_no_http_header() -> None:
    with mirror._git_env(
        "git@github.com:acme/infra.git", GitAuth(private_key="KEY")
    ) as env:
        assert "GIT_CONFIG_COUNT" not in env
        assert "GIT_SSH_COMMAND" in env


def test_without_credentials_the_environment_stays_anonymous() -> None:
    with mirror._git_env("https://github.com/acme/infra.git", None) as env:
        assert "GIT_CONFIG_COUNT" not in env


@pytest.mark.parametrize(
    "stderr",
    [
        "fatal: unable to access 'https://x/': The requested URL returned error: 401",
        "fatal: unable to access 'https://x/': The requested URL returned error: 403",
    ],
)
def test_a_rejected_token_is_invalid(stderr: str) -> None:
    assert mirror._classify(stderr) == "invalid"


def test_config_injected_through_the_environment_is_not_inherited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GIT_CONFIG_COUNT", "1")
    monkeypatch.setenv("GIT_CONFIG_KEY_0", "http.extraHeader")
    monkeypatch.setenv("GIT_CONFIG_VALUE_0", "X-Evil: 1")
    monkeypatch.setenv("GIT_CONFIG_PARAMETERS", "'x.y=z'")
    with mirror._git_env("https://github.com/acme/infra.git", None) as env:
        assert not [
            k
            for k in env
            if k.startswith("GIT_CONFIG_")
            and k
            not in (
                "GIT_CONFIG_NOSYSTEM",
                "GIT_CONFIG_GLOBAL",
            )
        ]
