"""Shapes shared by every `RunnerService` RPC handler and `materialize.py`.

The backend resolves playbooks/hosts/scripts against its own database before
ever calling ansible (see `packages/api/src/v1/run/handler.ts`), so these are
just plain data carriers for what arrives already-resolved over gRPC — no
network calls live here.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel

from app.services.git.auth import GitAuth, git_auth


def parse_extravars(raw: str) -> dict[str, Any]:
    """Extra vars of a run: a JSON object, so each value keeps its type."""
    if not raw:
        return {}
    try:
        extravars = json.loads(raw)
    except ValueError as exc:
        raise ValueError("Extra vars are not valid JSON") from exc
    if not isinstance(extravars, dict):
        raise ValueError("Extra vars must be a JSON object")
    return extravars


class ResolvedHost(BaseModel):
    name: str
    address: str
    port: int | None = None
    username: str
    privateKey: str
    connection: str


class GitPlaybookSource(BaseModel):
    repository_id: str
    url: str
    commit: str
    path: str
    private_key: str | None = None
    token_username: str | None = None
    token: str | None = None
    vault_password: str | None = None

    def auth(self) -> GitAuth | None:
        return git_auth(self.private_key, self.token_username, self.token)


class ResolvedPlaybook(BaseModel):
    name: str
    content: str
    # Set for Git-sourced playbooks: run ``path`` from the exported tree.
    git: GitPlaybookSource | None = None


class ResolvedRunBundle(BaseModel):
    playbook: ResolvedPlaybook
    hosts: list[ResolvedHost]
    disabled_roles: list[str] = []


def playbook_from_proto(playbook) -> ResolvedPlaybook:
    git = None
    if playbook.HasField("git"):
        source = playbook.git
        git = GitPlaybookSource(
            repository_id=source.repository_id,
            url=source.url,
            commit=source.commit,
            path=source.path,
            private_key=source.private_key if source.HasField("private_key") else None,
            token_username=source.token.username if source.HasField("token") else None,
            token=source.token.token if source.HasField("token") else None,
            vault_password=(
                source.vault_password if source.HasField("vault_password") else None
            ),
        )
    return ResolvedPlaybook(name=playbook.name, content=playbook.content, git=git)


def host_from_proto(host) -> ResolvedHost:
    return ResolvedHost(
        name=host.name,
        address=host.address,
        port=host.port if host.HasField("port") else None,
        username=host.username,
        privateKey=host.private_key,
        connection=host.connection,
    )
