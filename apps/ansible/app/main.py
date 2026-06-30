from fastapi import FastAPI
from scalar_fastapi import get_scalar_api_reference

from app.api.routes import routes

app = FastAPI()

app.include_router(routes.router)


@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
        scalar_favicon_url="https://avatars.githubusercontent.com/u/152280541?v=4",
    )
