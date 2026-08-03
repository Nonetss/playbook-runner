import grpc
from loguru import logger


class TokenAuthInterceptor(grpc.aio.ServerInterceptor):
    """Mirrors the HTTP bearer-token check, for gRPC metadata."""

    def __init__(self, expected_token: str) -> None:
        self._expected_token = expected_token

    async def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata or [])
        if metadata.get("authorization") != self._expected_token:
            logger.bind(method=handler_call_details.method).warning(
                "grpc call rejected (invalid token)"
            )

            async def deny(request, context):
                await context.abort(
                    grpc.StatusCode.UNAUTHENTICATED, "Invalid or missing token"
                )

            return grpc.unary_unary_rpc_method_handler(deny)

        return await continuation(handler_call_details)
