"""Diagnostic route: pings the backend's PingService over gRPC.

Counterpart of the backend's `grpcDemo.ping` oRPC endpoint (which pings this
service). Confirms both directions of the ansible <-> backend gRPC link.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.config import settings
from app.grpc.stubs import PingRequest, PingServiceStub

router = APIRouter(tags=["grpc-demo"])


@router.get("/grpc-ping-backend")
async def grpc_ping_backend(request: Request):
    stub = PingServiceStub(request.app.state.backend_channel)
    reply = await stub.Ping(
        PingRequest(message="hello from ansible"),
        metadata=(("authorization", settings.service_token),),
    )
    return {"message": reply.message, "from_service": reply.from_service}
