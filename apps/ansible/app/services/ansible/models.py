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


class ResolvedPlaybook(BaseModel):
    name: str
    content: str


class ResolvedScript(BaseModel):
    name: str
    content: str
    language: str = "bash"


class ResolvedRunBundle(BaseModel):
    playbook: ResolvedPlaybook
    hosts: list[ResolvedHost]


class ResolvedScriptBundle(BaseModel):
    script: ResolvedScript
    hosts: list[ResolvedHost]


def host_from_proto(host) -> ResolvedHost:
    return ResolvedHost(
        name=host.name,
        address=host.address,
        port=host.port if host.HasField("port") else None,
        username=host.username,
        privateKey=host.private_key,
        connection=host.connection,
    )
