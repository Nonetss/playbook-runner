"""Cómo se autentica el runner en un remoto Git: clave SSH o token por HTTPS."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GitAuth:
    """Una clave privada SSH, o un usuario y un token para remotos ``https``."""

    private_key: str | None = None
    username: str | None = None
    token: str | None = None


def git_auth(
    private_key: str | None, username: str | None, token: str | None
) -> GitAuth | None:
    """``None`` si no hay ninguna credencial (remoto público)."""
    if not private_key and not token:
        return None
    return GitAuth(private_key=private_key or None, username=username, token=token)
