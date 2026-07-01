from fastapi import APIRouter

from app.api.routes import health, me
from app.api.routes.v0 import command, ping, run, run_internal

router = APIRouter(prefix="/api")

router.include_router(me.router)
router.include_router(health.router)
router.include_router(ping.router, prefix="/v0")
router.include_router(run.router, prefix="/v0")
router.include_router(run_internal.router, prefix="/v0")
router.include_router(command.router, prefix="/v0")
