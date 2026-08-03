from fastapi import APIRouter

from app.api.routes import grpc_demo, health

router = APIRouter(prefix="/api")

router.include_router(health.router)
router.include_router(grpc_demo.router)
