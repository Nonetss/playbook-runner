from fastapi import APIRouter

from app.api.routes import health, me

router = APIRouter(prefix="/api")

router.include_router(me.router)
router.include_router(health.router)
