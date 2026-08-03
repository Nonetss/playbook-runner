from time import perf_counter

from fastapi import FastAPI, Request
from loguru import logger
from scalar_fastapi import get_scalar_api_reference

from app.api.routes import routes
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging(
    "playbook-runner-ansible",
    environment=settings.environment,
    log_level=settings.log_level,
)

app = FastAPI(title="Playbook Runner Ansible API")


@app.middleware("http")
async def request_logger(request: Request, call_next):
    start = perf_counter()
    response = await call_next(request)
    latency_ms = round((perf_counter() - start) * 1000, 2)
    level = (
        "ERROR"
        if response.status_code >= 500
        else "WARNING"
        if response.status_code >= 400
        else "INFO"
    )
    logger.bind(
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        latencyMs=latency_ms,
    ).log(level, "request")
    return response


app.include_router(routes.router, prefix="/ansible")


@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
        scalar_favicon_url="https://avatars.githubusercontent.com/u/152280541?v=4",
    )
