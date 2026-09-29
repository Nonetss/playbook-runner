"""Shapes shared by every `RunnerService` RPC handler and `materialize.py`.

The backend resolves playbooks/hosts/scripts against its own database before
ever calling ansible (see `packages/api/src/v1/run/handler.ts`), so these are
just plain data carriers for what arrives already-resolved over gRPC — no
network calls live here.
"""

from __future__ import annotations

from pydantic import BaseModel


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


class ResolvedPlaybook(BaseModel):
    name: str
    content: str
    # Set for Git-sourced playbooks: run ``path`` from the exported tree.
    git: GitPlaybookSource | None = None


class ResolvedRunBundle(BaseModel):
    playbook: ResolvedPlaybook
    hosts: list[ResolvedHost]


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
