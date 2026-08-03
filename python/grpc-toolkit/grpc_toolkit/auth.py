import grpc
from loguru import logger


class TokenAuthInterceptor(grpc.aio.ServerInterceptor):
    """Mirrors the HTTP bearer-token check, for gRPC metadata."""

    def __init__(self, expected_token: str) -> None:
        self._expected_token = expected_token

    async def intercept_service(self, continuation, handler_call_details):
        # Resolve the real handler first so a denied call can be rejected with
        # one of matching cardinality (unary vs. streaming) — returning e.g. a
        # unary_unary handler for an RPC the client opened as server-streaming
        # (like `RunnerService.RunBundle`) surfaces as a confusing low-level
        # error instead of a clean UNAUTHENTICATED status.
        handler = await continuation(handler_call_details)
        if handler is None:
            return handler

        metadata = dict(handler_call_details.invocation_metadata or [])
        if metadata.get("authorization") == self._expected_token:
            return handler

        logger.bind(method=handler_call_details.method).warning(
            "grpc call rejected (invalid token)"
        )

        async def deny_unary(request, context):
            await context.abort(
                grpc.StatusCode.UNAUTHENTICATED, "Invalid or missing token"
            )

        async def deny_stream(request, context):
            await context.abort(
                grpc.StatusCode.UNAUTHENTICATED, "Invalid or missing token"
            )
            yield  # unreachable (abort raises) - satisfies generator typing

        if handler.unary_stream:
            return grpc.unary_stream_rpc_method_handler(
                deny_stream,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer,
            )
        return grpc.unary_unary_rpc_method_handler(
            deny_unary,
            request_deserializer=handler.request_deserializer,
            response_serializer=handler.response_serializer,
        )
