"""FastAPI dependencies shared across routes."""

from __future__ import annotations

from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings


class AuthUser(BaseModel):
    """Full Better Auth user object as returned by the backend."""

    id: str
    email: str
    name: str
    role: str
    emailVerified: bool
    image: str | None = None
    createdAt: str
    updatedAt: str
    banned: bool
    banReason: str | None = None
    banExpires: str | None = None

    model_config = {"extra": "allow"}


async def get_current_user(
    request: Request,
) -> AuthUser:
    """Validate the session cookie against the Better Auth backend.

    Forwards the incoming ``Cookie`` header to
    ``GET {backend_url}/api/auth/get-session`` and returns the user on
    success.  Raises 401 if the session is missing or invalid.
    """
    cookie_header = request.headers.get("cookie", "")
    if not cookie_header:
        raise HTTPException(status_code=401, detail="No session cookie")

    url = f"{settings.backend_url}/api/auth/get-session"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers={"cookie": cookie_header})
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Auth backend unreachable") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    body: dict[str, Any] = resp.json()
    # Better Auth's get-session returns ``{"session": ..., "user": ...}``.
    # Older/alternate setups returned the user object directly, so accept
    # both shapes: prefer the nested ``user`` and fall back to the root.
    if not isinstance(body, dict):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = body.get("user") if isinstance(body.get("user"), dict) else body
    if not (isinstance(user, dict) and "id" in user and "email" in user):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return AuthUser.model_validate(user)


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
