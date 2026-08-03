import grpc
from grpc_toolkit import start_grpc_server as _start_grpc_server

from app.core.config import settings
from app.grpc.services.ping import PingServicer
from app.grpc.stubs import add_PingServiceServicer_to_server

GRPC_PORT = 50051


def _register(server: grpc.aio.Server) -> None:
    add_PingServiceServicer_to_server(PingServicer(), server)


async def start_grpc_server() -> grpc.aio.Server:
    return await _start_grpc_server(
        port=GRPC_PORT, token=settings.service_token, register=_register
    )
