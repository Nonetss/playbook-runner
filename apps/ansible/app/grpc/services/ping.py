from loguru import logger

from app.grpc.stubs import PingResponse, PingServiceServicer

SERVICE_NAME = "ansible"


class PingServicer(PingServiceServicer):
    async def Ping(self, request, context):
        logger.bind(peer=context.peer(), message=request.message).info("Ping recibido")
        return PingResponse(
            message=f"pong: {request.message}", from_service=SERVICE_NAME
        )
