from collections.abc import Callable

import grpc

from grpc_toolkit.auth import TokenAuthInterceptor

# Accept the backend's HTTP/2 keepalive pings (every 30 s, see
# ``packages/grpc/src/client.ts``). The minimum interval must stay below the
# client's ping interval: the C-core default (5 min) counts each ping as a
# strike and closes the connection with ``GOAWAY too_many_pings``.
MIN_RECV_PING_INTERVAL_MS = 20_000
MAX_PING_STRIKES = 2

SERVER_OPTIONS = [
    ("grpc.keepalive_permit_without_calls", 1),
    ("grpc.http2.min_recv_ping_interval_without_data_ms", MIN_RECV_PING_INTERVAL_MS),
    ("grpc.http2.max_ping_strikes", MAX_PING_STRIKES),
]


async def start_grpc_server(
    *, port: int, token: str, register: Callable[[grpc.aio.Server], None]
) -> grpc.aio.Server:
    server = grpc.aio.server(
        interceptors=[TokenAuthInterceptor(token)], options=SERVER_OPTIONS
    )
    register(server)
    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    return server
