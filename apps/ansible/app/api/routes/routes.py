from fastapi import APIRouter

from app.api.routes import health

router = APIRouter(prefix="/api")

router.include_router(health.router)
