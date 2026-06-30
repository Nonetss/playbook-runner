"""Current-user route.

GET /api/me — returns the authenticated user's profile.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AuthUser, CurrentUser

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=AuthUser)
async def me(user: CurrentUser) -> AuthUser:
    """Return the profile of the currently authenticated user."""
    return user
