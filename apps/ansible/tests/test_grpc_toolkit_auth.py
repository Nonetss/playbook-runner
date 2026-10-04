"""``TokenAuthInterceptor``: only calls carrying the shared token get through."""

import asyncio
from dataclasses import dataclass, field

import grpc
import pytest
from grpc_toolkit.auth import TokenAuthInterceptor

TOKEN = "s" * 32


@dataclass
class CallDetails:
    method: str = "/run.RunnerService/RunBundle"
    invocation_metadata: tuple[tuple[str, str], ...] | None = ()


class Aborted(Exception):
    pass


@dataclass
class FakeContext:
    aborted: list[tuple[grpc.StatusCode, str]] = field(default_factory=list)

    async def abort(self, code: grpc.StatusCode, details: str):
        self.aborted.append((code, details))
        raise Aborted


def unary_handler():
    async def behaviour(request, context):
        return "ok"

    return grpc.unary_unary_rpc_method_handler(behaviour)


def stream_handler():
    async def behaviour(request, context):
        yield "ok"

    return grpc.unary_stream_rpc_method_handler(behaviour)


def intercept(expected: str, metadata, handler):
    async def continuation(_details):
        return handler

    interceptor = TokenAuthInterceptor(expected)
    return asyncio.run(
        interceptor.intercept_service(
            continuation, CallDetails(invocation_metadata=metadata)
        )
    )


def test_correct_token_passes_the_original_handler() -> None:
    handler = unary_handler()
    assert intercept(TOKEN, (("authorization", TOKEN),), handler) is handler


@pytest.mark.parametrize(
    ("expected", "metadata"),
    [
        (TOKEN, ()),
        (TOKEN, None),
        (TOKEN, (("authorization", "wrong"),)),
        (TOKEN, (("authorization", TOKEN[:-1]),)),
        (TOKEN, (("x-other", TOKEN),)),
        ("", (("authorization", ""),)),
        ("", ()),
    ],
)
def test_bad_or_missing_token_is_denied(expected: str, metadata) -> None:
    handler = unary_handler()
    denied = intercept(expected, metadata, handler)
    assert denied is not handler

    context = FakeContext()
    with pytest.raises(Aborted):
        asyncio.run(denied.unary_unary(None, context))
    assert context.aborted[0][0] == grpc.StatusCode.UNAUTHENTICATED


def test_denied_streaming_call_keeps_its_cardinality() -> None:
    denied = intercept(TOKEN, (), stream_handler())
    assert denied.unary_stream is not None
    assert denied.unary_unary is None

    async def drain():
        return [frame async for frame in denied.unary_stream(None, context)]

    context = FakeContext()
    with pytest.raises(Aborted):
        asyncio.run(drain())
    assert context.aborted[0][0] == grpc.StatusCode.UNAUTHENTICATED


def test_denied_unary_call_keeps_its_cardinality() -> None:
    denied = intercept(TOKEN, (), unary_handler())
    assert denied.unary_unary is not None
    assert denied.unary_stream is None


def test_unknown_method_passes_through() -> None:
    assert intercept(TOKEN, (), None) is None
