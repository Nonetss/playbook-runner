from collections.abc import Callable

import grpc

from grpc_toolkit.auth import TokenAuthInterceptor


async def start_grpc_server(
    *, port: int, token: str, register: Callable[[grpc.aio.Server], None]
) -> grpc.aio.Server:
    server = grpc.aio.server(interceptors=[TokenAuthInterceptor(token)])
    register(server)
    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    return server
