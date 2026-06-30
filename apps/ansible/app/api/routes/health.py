"""Current-user route.

GET /api/health — returns the health of the application.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health() -> str:
    """Return the health of the application."""
    return "OK"
